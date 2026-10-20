export function animalLabel(name: string) {
  const pet = name.match(/^(cat|dog|turtle)(\d*)$/);
  if (pet)
    return `${pet[1][0].toUpperCase() + pet[1].slice(1)}${pet[2] ? ` · appearance ${pet[2]}` : ''}`;
  if (name === 'horse') return 'Horse';
  return name.replace(/^Baby(?=[A-Z])/, 'Baby ').replace(/^ShearedSheep$/, 'Sheared Sheep');
}
