import { fireEvent, render, screen } from '@testing-library/react-native'
import { MethodSheet } from '../MethodSheet'

it('selects a calculation method and closes the sheet', () => {
  const onSelect = jest.fn()
  const onClose = jest.fn()
  render(<MethodSheet visible onClose={onClose} methodId="egyptian" onSelect={onSelect} />)
  fireEvent.press(screen.getByRole('radio', { name: 'أم القرى (مكة المكرمة)' }))
  expect(onSelect).toHaveBeenCalledWith('umm_al_qura')
  expect(onClose).toHaveBeenCalledTimes(1)
})
