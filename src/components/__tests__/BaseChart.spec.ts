import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BaseChart from '../BaseChart.vue'

const echartsMock = vi.hoisted(() => {
  const chart = {
    dispose: vi.fn(),
    hideLoading: vi.fn(),
    resize: vi.fn(),
    setOption: vi.fn(),
    showLoading: vi.fn()
  }

  return {
    chart,
    init: vi.fn(() => chart),
    reset: () => {
      chart.dispose.mockClear()
      chart.hideLoading.mockClear()
      chart.resize.mockClear()
      chart.setOption.mockClear()
      chart.showLoading.mockClear()
    }
  }
})

vi.mock('echarts', () => ({
  init: echartsMock.init
}))

describe('BaseChart', () => {
  beforeEach(() => {
    echartsMock.reset()
  })

  it('initializes, updates, resizes and disposes the chart instance', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const initialOption = {
      series: [{ data: [1, 2, 3], type: 'bar' }],
      xAxis: { type: 'category' },
      yAxis: { type: 'value' }
    }
    const nextOption = {
      series: [{ data: [3, 2, 1], type: 'line' }],
      xAxis: { type: 'category' },
      yAxis: { type: 'value' }
    }

    const wrapper = mount(BaseChart, {
      props: {
        height: 240,
        loading: true,
        option: initialOption
      }
    })

    expect(wrapper.attributes('style')).toContain('height: 240px')
    expect(echartsMock.init).toHaveBeenCalledTimes(1)
    expect(echartsMock.chart.setOption).toHaveBeenCalledWith(initialOption, true)
    expect(echartsMock.chart.showLoading).toHaveBeenCalledTimes(1)
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    await wrapper.setProps({
      loading: false,
      option: nextOption
    })

    expect(echartsMock.chart.hideLoading).toHaveBeenCalledTimes(1)
    expect(echartsMock.chart.setOption).toHaveBeenLastCalledWith(nextOption, true)

    window.dispatchEvent(new Event('resize'))
    expect(echartsMock.chart.resize).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(echartsMock.chart.dispose).toHaveBeenCalledTimes(1)
  })
})
