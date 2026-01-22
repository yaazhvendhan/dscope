export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const value = parseFloat((Math.abs(bytes) / Math.pow(k, i)).toFixed(dm));
    return (bytes < 0 ? '-' : '') + value + ' ' + sizes[i];
}
