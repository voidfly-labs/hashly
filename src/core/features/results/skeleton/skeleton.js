export function removeSkeleton(root = document) {
  root.querySelectorAll('[data-skeleton]').forEach((el) => el.remove());
}
