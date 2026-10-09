// كل نادٍ يأخذ تدرجًا لونيًا ثابتًا حسب رقمه
const gradients = [
  "from-orange-500 to-rose-500",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-orange-600",
];

export function gradientFor(id: string) {
  return gradients[Number(id) % gradients.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}