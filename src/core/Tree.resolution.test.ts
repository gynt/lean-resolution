import { rcompare, sort } from "semver";
import { repositoryFromYaml } from "../Repository";
import { Tree } from "./Tree";
import { Edge } from "./Edge";


describe('Tree resolution: >=', () => {

  const repoYaml = `
  A@0.0.1: {}
  A@0.0.2: {}
  A@0.0.3: {}
  B@0.0.1:
    A: =0.0.1
  B@0.0.2:
    A: =0.0.2
  B@0.0.3:
    A: ">=0.0.2"
  C@0.0.1:
    A: =0.0.1
    B: =0.0.1
  C@0.0.2:
    A: =0.0.2
    B: =0.0.2
  C@0.0.3:
    A: =0.0.3
    B: ">=0.0.2"
  `

  const repository = repositoryFromYaml(repoYaml)

  const tree: Tree = Tree.buildInitialTree(repository)

  const deps = tree.allDependenciesFor(repository.at(-1)!)

  test('selection validity', () => {
    expect(tree.isValidSelection(deps)).toBe(true)
  })

  test('sorting', () => {
    const sorted = tree.topologicalSort(deps)

    expect(sorted.map((n) => n.id).join(', ')).toBe('A@0.0.3, B@0.0.3, C@0.0.3')
  })
})


describe('Tree resolution: ==', () => {

  const repoYaml = `
  A@0.0.1: {}
  A@0.0.2: {}
  A@0.0.3: {}
  B@0.0.1:
    A: =0.0.1
  B@0.0.2:
    A: =0.0.2

  # Trouble statement is here, A@0.0.2 should be selected
  B@0.0.3:
    A: "=0.0.2"
  
  C@0.0.1:
    A: =0.0.1
    B: =0.0.1
  C@0.0.2:
    A: =0.0.2
    B: =0.0.2
  C@0.0.3:
  # While this statement desires A@0.0.3
    A: ">=0.0.2"
    B: ">=0.0.2"
  `

  const repository = repositoryFromYaml(repoYaml)

  const tree: Tree = Tree.buildInitialTree(repository)

  const initialPackage = repository.at(-1)!

  let deps = tree.allDependenciesFor(initialPackage)

  if (!tree.isValidSelection(deps)) {
    deps = tree.fix(initialPackage, 'overlap')
  }

  test('sorting', () => {
    const sorted = tree.topologicalSort(deps)

    expect(sorted.map((n) => n.id).join(', ')).toBe('A@0.0.2, B@0.0.3, C@0.0.3')
  })
})