import crypto from 'node:crypto';

const toBool = (value) => value === true || value === 'true';

export function maskPhone(value = '') {
    const text = String(value || '');
    if (!text) return '';
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    return `${text.startsWith('+') ? '+' : ''}****${digits.slice(-4)}`;
}

export function auditLog(action, {
    actor = 'system',
    target = '',
    result = 'success',
    metadata = {}
} = {}) {
    console.log(JSON.stringify({
        severity: result === 'failure' ? 'WARNING' : 'INFO',
        audit: {
            actor,
            action,
            target,
            result,
            timestamp: new Date().toISOString(),
            metadata
        }
    }));
}

export function getTwilioWebhookUrl(request, configuredUrl = '') {
    if (configuredUrl) return configuredUrl;

    const proto = request.headers['x-forwarded-proto'] || request.protocol || 'https';
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    return `${proto}://${host}${request.raw.url}`;
}

export function validateTwilioSignature({ authToken, signature, url, params = {} }) {
    if (!authToken || !signature || !url) return false;

    const payload = Object.keys(params)
        .sort()
        .reduce((acc, key) => `${acc}${key}${params[key] ?? ''}`, url);

    const expected = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(payload, 'utf8'))
        .digest('base64');

    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    return expectedBuffer.length === actualBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function shouldValidateTwilioSignature(value) {
    return toBool(value);
}
