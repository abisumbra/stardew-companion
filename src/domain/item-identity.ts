const prefixes: Record<string, string> = {
  O: 'object',
  BC: 'craftable',
  TR: 'trinket',
  W: 'weapon',
  B: 'boots',
  S: 'shirt',
  P: 'pants',
  H: 'hat',
  F: 'furniture',
  T: 'tool',
};
export const catalogItemId = (id: string) =>
  id.replace(/^\((O|BC|TR|W|B|S|P|H|F|T)\)/, (_, kind: string) => `${prefixes[kind]}:`);
