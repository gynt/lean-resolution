import { Dependency } from "../Dependency";
import { Package } from "../Package";
import { Tree } from "./Tree";

const repository = [
  new Package('A', '0.0.1'),
  new Package('A', '0.0.2'),
  new Package('A', '0.0.3'),
  new Package('B', '0.0.1', [
    new Dependency('A', '=0.0.1')
  ]),
  new Package('B', '0.0.2', [
    new Dependency('A', '=0.0.2')
  ]),
  new Package('B', '0.0.3', [
    new Dependency('A', '=0.0.3')
  ]),
  new Package('C', '0.0.1', [
    new Dependency('A', '=0.0.1'),
    new Dependency('B', '=0.0.1')
  ]),
  new Package('C', '0.0.2', [
    new Dependency('A', '=0.0.2'),
    new Dependency('B', '=0.0.2')
  ]),
  new Package('C', '0.0.3', [
    new Dependency('A', '=0.0.3'),
    new Dependency('B', '=0.0.3')
  ])
]


describe('Tree.buildInitialTree', () => {
  test('tree creation', () => {
    const tree = Tree.buildInitialTree(repository)
    expect(tree.ok).toBe(true);
  });
});