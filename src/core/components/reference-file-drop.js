import { readReferenceFile } from '~core/utils/reference-file.js';

const DROP_CLASS = 'verify__field--drop';

const hasFiles = (e) => Boolean(e.dataTransfer?.types?.includes('Files'));

/** Lets a file be dropped straight onto the reference field to read its text into it
 *  (the drop counterpart of the Upload button; same callbacks). Only a drop landing on
 *  the field counts: a file dropped anywhere else still goes to the main file drop.
 *
 *  The field's file-drag events stop here instead of bubbling to the page-wide drag
 *  handlers in FileSection. Those would otherwise light up the main drop zone and hash
 *  the file, which is exactly what a drop on this field must not do. Dragging text onto
 *  the field is left to the browser. */
export function initReferenceFileDrop(field, { getFileName, onText, onRejected }) {
  if (!field) return;
  let depth = 0; // dragenter/dragleave also fire for the field's children

  const setOver = (over) => field.classList.toggle(DROP_CLASS, over);

  field.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.stopPropagation();
    depth++;
    setOver(true);
  });

  field.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    e.stopPropagation();
    depth = Math.max(0, depth - 1);
    if (!depth) setOver(false);
  });

  field.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); // allows the drop
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  });

  field.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); // otherwise the browser opens the file
    e.stopPropagation();
    depth = 0;
    setOver(false);

    const [file] = e.dataTransfer.files;
    if (!file) return;
    const { line, error } = await readReferenceFile(file, getFileName());
    if (error) onRejected(error);
    else onText(line);
  });
}
