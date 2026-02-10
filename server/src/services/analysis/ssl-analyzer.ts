import tls from 'tls';

export interface SSLAnalysisResult {
  valid: boolean;
  issuer: string | null;
  subject: string | null;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  protocolVersion: string | null;
  cipher: string | null;
  cipherStrength: number | null;
  chainValid: boolean;
  selfSigned: boolean;
  errors: string[];
  rawData: Record<string, unknown>;
}

const CONNECTION_TIMEOUT_MS = 10000;

export async function analyzeSSL(domain: string): Promise<SSLAnalysisResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const rawData: Record<string, unknown> = {};

    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        timeout: CONNECTION_TIMEOUT_MS,
        rejectUnauthorized: false,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          const authorized = socket.authorized;
          const authError = socket.authorizationError;
          const protocol = socket.getProtocol();
          const cipherInfo = socket.getCipher() as any;

          if (!cert || !cert.subject) {
            errors.push('No certificate returned');
            socket.destroy();
            resolve({
              valid: false,
              issuer: null,
              subject: null,
              expiryDate: null,
              daysUntilExpiry: null,
              protocolVersion: protocol || null,
              cipher: cipherInfo?.name || null,
              cipherStrength: cipherInfo?.bits ?? null,
              chainValid: false,
              selfSigned: false,
              errors,
              rawData,
            });
            return;
          }

          const issuerOrg = cert.issuer?.O || cert.issuer?.CN || null;
          const subjectCN = cert.subject?.CN || null;
          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
          const now = new Date();

          let daysUntilExpiry: number | null = null;
          if (validTo) {
            daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          // Check if expired
          const isExpired = validTo ? validTo < now : false;
          if (isExpired) {
            errors.push('Certificate has expired');
          }

          // Check if not yet valid
          const isNotYetValid = validFrom ? validFrom > now : false;
          if (isNotYetValid) {
            errors.push('Certificate is not yet valid');
          }

          // Check if self-signed
          const selfSigned = cert.issuer?.CN === cert.subject?.CN &&
            cert.issuer?.O === cert.subject?.O;
          if (selfSigned) {
            errors.push('Certificate is self-signed');
          }

          // Check chain validity
          const chainValid = authorized && !authError;
          if (!chainValid && authError) {
            errors.push(`Chain validation: ${authError}`);
          }

          // Check weak protocols
          if (protocol && ['TLSv1', 'SSLv3'].includes(protocol)) {
            errors.push(`Weak protocol: ${protocol}`);
          }

          // Expiring soon warning
          if (daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
            errors.push(`Certificate expiring in ${daysUntilExpiry} days`);
          }

          rawData.cert = {
            subject: cert.subject,
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
            serialNumber: cert.serialNumber,
            fingerprint: cert.fingerprint,
            fingerprint256: cert.fingerprint256,
          };
          rawData.protocol = protocol;
          rawData.cipher = cipherInfo;
          rawData.authorized = authorized;
          rawData.authorizationError = authError;

          const valid = !isExpired && !isNotYetValid && chainValid && !selfSigned;

          socket.destroy();
          resolve({
            valid,
            issuer: issuerOrg,
            subject: subjectCN,
            expiryDate: validTo ? validTo.toISOString() : null,
            daysUntilExpiry,
            protocolVersion: protocol || null,
            cipher: cipherInfo?.name || null,
            cipherStrength: cipherInfo?.bits ?? null,
            chainValid,
            selfSigned,
            errors,
            rawData,
          });
        } catch (err: any) {
          errors.push(`Certificate parsing error: ${err.message}`);
          socket.destroy();
          resolve({
            valid: false,
            issuer: null,
            subject: null,
            expiryDate: null,
            daysUntilExpiry: null,
            protocolVersion: null,
            cipher: null,
            cipherStrength: null,
            chainValid: false,
            selfSigned: false,
            errors,
            rawData,
          });
        }
      }
    );

    socket.on('error', (err: any) => {
      errors.push(`Connection error: ${err.message}`);
      resolve({
        valid: false,
        issuer: null,
        subject: null,
        expiryDate: null,
        daysUntilExpiry: null,
        protocolVersion: null,
        cipher: null,
        cipherStrength: null,
        chainValid: false,
        selfSigned: false,
        errors,
        rawData,
      });
    });

    socket.on('timeout', () => {
      errors.push('Connection timed out');
      socket.destroy();
      resolve({
        valid: false,
        issuer: null,
        subject: null,
        expiryDate: null,
        daysUntilExpiry: null,
        protocolVersion: null,
        cipher: null,
        cipherStrength: null,
        chainValid: false,
        selfSigned: false,
        errors,
        rawData,
      });
    });
  });
}
