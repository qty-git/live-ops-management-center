import type { ComparisonRow } from '../types'

interface ComparisonTableProps {
  rows: ComparisonRow[]
  onNoteChange: (key: string, patch: { deviationReason?: string; tomorrowSuggestion?: string }) => void
}

export function ComparisonTable({ rows, onNoteChange }: ComparisonTableProps) {
  return (
    <section className="data-section">
      <div className="section-header">
        <div>
          <h2>计划与实际对照表</h2>
          <p>有来源计划的实际任务自动匹配；没有来源计划的实际任务标为新增工作。</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>计划时间段</th>
              <th>计划岗位</th>
              <th>计划内容</th>
              <th>实际时间段</th>
              <th>实际岗位</th>
              <th>实际工作内容</th>
              <th>偏差状态</th>
              <th>偏差原因</th>
              <th>明日优化建议</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.plan ? `${row.plan.startTime}-${row.plan.endTime}` : '-'}</td>
                <td>{row.plan?.role ?? '-'}</td>
                <td>{row.plan?.content ?? '-'}</td>
                <td>{row.actual ? `${row.actual.startTime}-${row.actual.endTime}` : '-'}</td>
                <td>{row.actual?.role ?? '-'}</td>
                <td>{row.actual?.content ?? '-'}</td>
                <td>
                  <span className={`deviation deviation-${row.deviationStatus}`}>{row.deviationStatus}</span>
                </td>
                <td>
                  <textarea
                    value={row.deviationReason}
                    onChange={(e) => onNoteChange(row.key, { deviationReason: e.target.value })}
                    placeholder="填写偏差原因"
                  />
                </td>
                <td>
                  <textarea
                    value={row.tomorrowSuggestion}
                    onChange={(e) => onNoteChange(row.key, { tomorrowSuggestion: e.target.value })}
                    placeholder="填写优化建议"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  暂无可对照记录
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
