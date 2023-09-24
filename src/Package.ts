import { Range, SemVer, intersects, maxSatisfying, satisfies } from 'semver'
import { Dependency } from './Dependency';

export class Package {
  name: string;
  version: SemVer;
  dependencies: Dependency[]

  constructor(name: string, version: string, dependencies?: Dependency[]) {
    this.name = name;
    this.version = new SemVer(version, { loose: true });
    this.dependencies = dependencies || [];

    if (this.version === null) {
      throw Error(`Illegal version: ${name} ${version}`)
    }
  }

  isFineWith(p: Package) {
    const relevantDependencies = this.dependencies.filter((d) => d.name === p.name)
    if (relevantDependencies.length === 0) return true

    const satisfactions = relevantDependencies.map((d, index) => {
      return { dependency: d, satisfaction: d.isSatisfiedBy(p) }
    })

    const dissatisfied = satisfactions.filter(({ dependency, satisfaction }) => satisfaction === false)

    if (dissatisfied.length > 0) {
      return false
    }

    return true
  }

  satisfiesDependency(d: Dependency) {
    return satisfies(this.version, d.versionRange)
  }

  toString() {
    return `${this.name}-${this.version}: ${this.dependencies.map((d) => d.toString()).join(', ')}`
  }

  get id() {
    return `${this.name}@${this.version}`
  }
}