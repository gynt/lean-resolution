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

  const deps = tree.allDependenciesForPackage(repository.at(-1)!)

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

  let deps = tree.allDependenciesForPackage(initialPackage)

  if (!tree.isValidSelection(deps)) {
    deps = tree.fixPackage(initialPackage, 'overlap')
  }

  test('sorting', () => {
    const sorted = tree.topologicalSort(deps)

    expect(sorted.map((n) => n.id).join(', ')).toBe('A@0.0.2, B@0.0.3, C@0.0.3')
  })
})


describe('Fictitious node: ==', () => {

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

  const packageIds = ['B@0.0.3', 'C@0.0.3']

  const tree: Tree = Tree.buildInitialTree(repository)


  test('solving', () => {

    const solution = tree.solve(packageIds.map((pid) => tree.nodeForID(pid).spec))

    expect(solution.map((n) => n.id).join(', ')).toBe('A@0.0.2, B@0.0.3, C@0.0.3')
  })
})


describe('Impossible problems', () => {

  const repoYaml = `
  A@0.0.1: {}
  A@0.0.2: {}
  A@0.0.3: {}
  B@0.0.1:
    A: =0.0.1
  B@0.0.2:
    A: =0.0.2

  # Trouble statement is here, A@0.0.1 conflicts
  B@0.0.3:
    A: "=0.0.1"
  
  C@0.0.1:
    A: =0.0.1
    B: =0.0.1
  C@0.0.2:
    A: =0.0.2
    B: =0.0.2
  C@0.0.3:
  # with A>=0.0.2
    A: ">=0.0.2"
    B: ">=0.0.2"
  `

  const repository = repositoryFromYaml(repoYaml)

  const packageIds = ['C@0.0.3']

  const tree: Tree = Tree.buildInitialTree(repository)

  // TODO
  // Actually, there is a solution if B@0.0.2 is selected.
  // The only algorithm I can think of which would reach this conclusion
  // is a general algorithm
  // that keeps track of all possible packages for a dependency requirement
  // and tries them one by one (highest version first).
  // That sounds expensive!
  test('solving', () => {
    expect(() => {
      tree.solve(packageIds.map((pid) => tree.nodeForID(pid).spec))
    }).toThrowError('Could not solve dependency A. Conflicting packages required: A: >=0.0.2 (required by C@0.0.3), A: 0.0.1 (required by B@0.0.3)')
  })

  const solution = tree.fixBruteForce(tree.nodeForID(packageIds[0]))
})