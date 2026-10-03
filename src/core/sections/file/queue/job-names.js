/** The names of the queue's jobs as one array that stays the same object until the list of files changes,
 *  so whoever keeps something worked out from it (the verify field's checksum-list assignment) can tell
 *  by identity that nothing changed. The queue gives a new `jobs` array for each drop and removes a file
 *  in place, so the array and its length say when the names are different. */
export function createJobNames(getJobs) {
  let source = null;
  let length = -1;
  let names = [];
  return () => {
    const jobs = getJobs();
    if (jobs !== source || jobs.length !== length) {
      source = jobs;
      length = jobs.length;
      names = jobs.map(({ name }) => name);
    }
    return names;
  };
}
