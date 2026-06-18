import { TimelinePage } from '../modules/timeline/pages/TimelinePage'

export const routes = [
  {
    key: 'timeline',
    label: '时间轴排班复盘',
    element: <TimelinePage mode="dashboard" />,
  },
]
