import type { WirdDefinition, WirdVersion } from '../types'
import { WIRD_LEVELS } from '../../content/levels'

import { planVersionHealing } from '../logic'

const TODAY = '2026-10-18'

function version(definition: WirdDefinition): WirdVersion {
  return {
    id: 'current-version',
    effectiveFrom: TODAY,
    definition,
    createdAt: 100,
  }
}

describe('planVersionHealing', () => {
  it('plans the matched level definition for tomorrow', () => {
    const changedDefinition = {
      ...WIRD_LEVELS[0].wird,
      items: WIRD_LEVELS[0].wird.items.map((item, index) =>
        index === 0 ? { ...item, label: `${item.label} changed` } : item,
      ),
    }

    expect(planVersionHealing(version(changedDefinition), WIRD_LEVELS, TODAY)).toEqual({
      definition: WIRD_LEVELS[0].wird,
      effectiveFrom: '2026-10-19',
    })
  })

  it.each([
    ['no current version', null],
    ['an unchanged definition', version(WIRD_LEVELS[0].wird)],
    [
      'a custom definition',
      version({
        areas: [{ id: 'custom-area', label: 'ورد مخصص', order: 0 }],
        items: [{ id: 'custom-item', areaId: 'custom-area', label: 'دعاء', kind: 'checkbox' }],
      }),
    ],
  ])('returns no plan for %s', (_caseName, current) => {
    expect(planVersionHealing(current, WIRD_LEVELS, TODAY)).toBeNull()
  })
})
