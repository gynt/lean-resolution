import { Dependency } from "../Dependency";
import { Package } from "../Package";
import { repositoryFromYaml } from "../Repository";
import { Node } from "./Node";
import { Tree } from "./Tree";



describe('Tree.buildInitialTree', () => {

  const repoYaml = `
  A@0.0.1: {}
  A@0.0.2: {}
  A@0.0.3: {}
  B@0.0.1:
    A: =0.0.1
  B@0.0.2:
    A: =0.0.2
  B@0.0.3:
    A: =0.0.3
  C@0.0.1:
    A: =0.0.1
    B: =0.0.1
  C@0.0.2:
    A: =0.0.2
    B: =0.0.2
  C@0.0.3:
    A: =0.0.3
    B: =0.0.3
  `

  const repository = repositoryFromYaml(repoYaml)

  let tree: Tree | undefined

  test('tree creation', () => {
    tree = Tree.buildInitialTree(repository)
    expect(tree.ok).toBe(true);
  });

  test('tree initial resolution', () => {

    expect(tree).toBeTruthy()

    Object.entries(tree!.nodes).forEach(([id, node]) => {
      const emptyEdgeTargets = node.edgesOut.filter((e) => !e.resolved)
      expect(emptyEdgeTargets.length).toBe(0)
    })
  })

  const initialPackage = repository.at(-1)!

  let dc: Node[] | undefined

  test('dependency selection', () => {

    expect(tree).toBeTruthy()

    dc = tree!.allDependenciesForPackage(initialPackage)

    expect(dc.length).toBe(3)
  })

  test('dependency selection validity', () => {

    expect(dc!).toBeTruthy()

    expect(tree!.isValidSelection(dc!)).toBe(true)
  })
});