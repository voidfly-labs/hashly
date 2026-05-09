export const Download = {
  filenameSafeTimestamp() {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `${date}-${time}`;
  },

  // mimeType defaults to application/octet-stream so the browser treats the
  // file as arbitrary data and uses the filename's extension as-is, rather
  // than mapping text/plain → .txt and overriding the intended extension.
  trigger(content, filename, mimeType = 'application/octet-stream') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
