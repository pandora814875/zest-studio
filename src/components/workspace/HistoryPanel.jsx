import { formatDateTime } from "../../lib/helpers";

export function HistoryPanel({ jobs }) {
  return (
    <div className="drawer-stack">
      <div className="drawer-card">
        <div className="drawer-card-head">
          <div>
            <h3>Recent build history</h3>
            <p className="drawer-copy">Scrollable job history with generated outputs, timestamps, and changed paths.</p>
          </div>
        </div>
        <div className="job-list job-list-expanded">
          {jobs.length ? (
            jobs.map((job) => (
              <div className="job-item" key={job.id}>
                <div className="job-item-head">
                  <strong>{job.title}</strong>
                  <span className={`job-status job-status-${job.status}`}>{job.status}</span>
                </div>
                <p>{job.summary}</p>
                <div className="job-item-meta">
                  <span>{formatDateTime(job.createdAt)}</span>
                  <span>{job.modelKey}</span>
                </div>
                <div className="job-operation-list">
                  {(job.operations || []).map((operation) => (
                    <span className="job-operation-pill" key={operation.id}>
                      {operation.path}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state-small">No history yet. Send a prompt to generate the first job.</div>
          )}
        </div>
      </div>
    </div>
  );
}
