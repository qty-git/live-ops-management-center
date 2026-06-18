import { ExternalLink } from 'lucide-react'
import type { TimelineTask } from '../types'

interface IssueListProps {
  tasks: TimelineTask[]
  onOpenTask: (task: TimelineTask) => void
}

export function IssueList({ tasks, onOpenTask }: IssueListProps) {
  const issueTasks = tasks.filter((task) => task.problem.trim())

  return (
    <section className="data-section">
      <div className="section-header">
        <div>
          <h2>问题记录</h2>
          <p>自动汇总当天实际任务中填写了“遇到的问题”的记录。</p>
        </div>
      </div>
      <div className="issue-list">
        {issueTasks.map((task) => (
          <article className="issue-item" key={task.id}>
            <div>
              <strong>
                {task.role} · {task.startTime}-{task.endTime}
              </strong>
              <p>{task.problem}</p>
              {task.solution ? <span>解决方案：{task.solution}</span> : null}
              {task.note ? <span>备注：{task.note}</span> : null}
            </div>
            <button className="secondary-button" type="button" onClick={() => onOpenTask(task)}>
              <ExternalLink size={15} /> 打开任务
            </button>
          </article>
        ))}
        {issueTasks.length === 0 ? <div className="empty-state">今天还没有问题记录。</div> : null}
      </div>
    </section>
  )
}
