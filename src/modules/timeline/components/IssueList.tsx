import { ExternalLink } from 'lucide-react'
import type { TimelineTask } from '../types'
import { collectTaskIssues } from '../utils'

interface IssueListProps {
  tasks: TimelineTask[]
  onOpenTask: (task: TimelineTask) => void
}

export function IssueList({ tasks, onOpenTask }: IssueListProps) {
  const issueItems = tasks.flatMap((task) => collectTaskIssues(task).map((issue) => ({ task, issue })))

  return (
    <section className="data-section">
      <div className="section-header">
        <div>
          <h2>问题记录</h2>
          <p>自动汇总当天实际任务中填写了“遇到的问题”的记录。</p>
        </div>
      </div>
      <div className="issue-list">
        {issueItems.map(({ task, issue }) => (
          <article className="issue-item" key={`${task.id}-${issue.id}`}>
            <div>
              <strong>
                {task.role} · {task.startTime}-{task.endTime}
              </strong>
              <p>{issue.problem}</p>
              {issue.solution ? <span>解决方案：{issue.solution}</span> : null}
              {task.note ? <span>备注：{task.note}</span> : null}
            </div>
            <button className="secondary-button" type="button" onClick={() => onOpenTask(task)}>
              <ExternalLink size={15} /> 打开任务
            </button>
          </article>
        ))}
        {issueItems.length === 0 ? <div className="empty-state">今天还没有问题记录。</div> : null}
      </div>
    </section>
  )
}
