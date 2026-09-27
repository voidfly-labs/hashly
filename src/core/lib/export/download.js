export const Download = {
  /** Today's date, local time, as `YYYY-MM-DD`: readable, sorts by name and has no colons, which Windows
   *  doesn't allow in a file name. */
  filenameDate() {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
    // Not at once: Safari and some Firefox versions can cancel a download whose URL is gone.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
