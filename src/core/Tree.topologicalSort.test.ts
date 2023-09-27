import { repositoryFromYaml } from "../Repository"
import { Tree } from "./Tree"

describe('Tree topological sort', () => {

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

  let tree: Tree = Tree.buildInitialTree(repository)
  const initialPackage = repository.at(-1)!

  const deps = tree.allDependenciesForPackage(initialPackage)

  test('selection validity', () => {

    const isValid = tree.isValidSolution(deps)

    expect(isValid).toBe(true)


  })


  test('sorting', () => {
    const sorted = tree.topologicalSort(deps)

    expect(sorted.map((n) => n.id).join(', ')).toBe('A@0.0.3, B@0.0.3, C@0.0.3')
  })

})