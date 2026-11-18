import { useState } from 'react';
import { ApprovalBadge } from '../../components/ApprovalBadge';
import { DataTable } from '../../components/DataTable';
import { Icon } from '../../components/Icon';
import { Kpi } from '../../components/Kpi';
import { Badge } from '../../components/ui/Badge';
import { Btn } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageHead } from '../../components/ui/PageHead';
import { inputCls } from '../../components/ui/styles';
import { useApp } from '../../context/AppContext';
import { DOCS } from '../../data/approvals';
import { cx } from '../../lib/utils';
import VerifiedTick from '../../../shared/VerifiedTick';
import { useVerified } from '../../../shared/verified';
import { adminClient } from '../../api/client';

function NameTick({ id, is_verified, verified }) {
  const local = useVerified(id);
  const show = Boolean(is_verified ?? verified ?? local);
  return show ? <VerifiedTick size={15} className="ml-1 inline" /> : null;
}

export function ReviewModal({ g, onClose, onDone }) {
  const { perms, setApprovals, setApprovedN, toast, addAudit } = useApp();
  const [docs, setDocs] = useState(() => {
    const fromObj = (g && typeof g.documents === 'object' && g.documents) ? g.documents : {};
    const initial = {};
    DOCS.forEach((d) => {
      if (fromObj[d]) {
        initial[d] = typeof fromObj[d] === 'string' ? { url: fromObj[d], name: d } : fromObj[d];
      }
    });
    return initial;
  });
  const [checks, setChecks] = useState(() => {
    const fromObj = (g && typeof g.documents === 'object' && g.documents) ? g.documents : {};
    return DOCS.map((d) => Boolean(fromObj[d]));
  });
  const [uploading, setUploading] = useState({});
  const [note, setNote] = useState(() => g.internal_note || g.note || '');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const verified = DOCS.filter((d, i) => Boolean(docs[d]) || checks[i]).length;
  const st = g.status.toUpperCase().replace(' ', '_');
  const finish = (title, desc, leave) => {
    toast({ title, desc });
    onClose();
    if (leave && onDone) onDone();
  };

  const handleUpload = async (docName, file, index) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, [docName]: true }));
    try {
      const res = await adminClient.upload.file(file);
      const fileUrl = res?.file_url || res?.url;
      const docEntry = {
        name: file.name,
        url: fileUrl,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString(),
      };
      const updatedDocs = { ...docs, [docName]: docEntry };
      setDocs(updatedDocs);
      setChecks((prev) => prev.map((c, i) => (i === index ? true : c)));

      try {
        await adminClient.approvals.saveDocuments(g.id, updatedDocs);
      } catch (err) {
        console.warn('Auto-save documents failed:', err);
      }

      setApprovals((a) =>
        a.map((x) => (x.id === g.id ? { ...x, documents: updatedDocs } : x))
      );
      toast({
        title: 'Document uploaded',
        desc: `${docName} uploaded and verified.`,
      });
    } catch (e) {
      console.error('Document upload failed:', e);
      toast({
        title: 'Upload failed',
        desc: e.message || 'Failed to upload document.',
        variant: 'destructive',
      });
    } finally {
      setUploading((prev) => ({ ...prev, [docName]: false }));
    }
  };

  const handleRemove = async (docName, index) => {
    const updatedDocs = { ...docs };
    delete updatedDocs[docName];
    setDocs(updatedDocs);
    setChecks((prev) => prev.map((c, i) => (i === index ? false : c)));
    try {
      await adminClient.approvals.saveDocuments(g.id, updatedDocs);
    } catch (err) {
      console.warn('Auto-save documents removal failed:', err);
    }
    setApprovals((a) =>
      a.map((x) => (x.id === g.id ? { ...x, documents: updatedDocs } : x))
    );
  };

  const approve = async () => {
    if (verified < DOCS.length) {
      toast({
        title: 'Documents Required',
        desc: `All ${DOCS.length} documents must be submitted and verified before approval.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      await adminClient.approvals.approve(g.id, { internal_note: note, note, documents: docs });
      setApprovals((a) => a.map((x) => (x.id === g.id ? { ...x, status: 'Approved', internal_note: note, documents: docs } : x)));
      setApprovedN((n) => n + 1);
      addAudit('UPDATE', 'gyms.Gym', g.id, { status: st }, { status: 'APPROVED', documents_verified: verified });
      finish(g.name + ' approved', 'The gym is now active and the owner has been notified.', true);
    } catch (e) {
      console.error('Approve failed:', e);
      toast({
        title: 'Approval failed',
        desc: e?.message || 'Failed to approve gym.',
        variant: 'destructive',
      });
    }
  };
  const startReview = async () => {
    try {
      await adminClient.approvals.review(g.id, note);
      await adminClient.approvals.saveDocuments(g.id, docs);
    } catch (e) {
      console.error('Start review failed:', e);
    }
    setApprovals((a) => a.map((x) => (x.id === g.id ? { ...x, status: 'Under Review', internal_note: note, documents: docs } : x)));
    addAudit('UPDATE', 'gyms.Gym', g.id, { status: st }, { status: 'UNDER_REVIEW' });
    finish('Review started', g.name + ' moved to Under Review.');
  };
  const reject = async () => {
    try {
      await adminClient.approvals.reject(g.id, reason.trim(), note);
    } catch (e) {
      console.error('Reject failed:', e);
    }
    setApprovals((a) => a.map((x) => (x.id === g.id ? { ...x, status: 'Rejected', internal_note: note, rejection_reason: reason.trim(), documents: docs } : x)));
    addAudit('UPDATE', 'gyms.Gym', g.id, { status: st }, { status: 'REJECTED', reason: reason.trim() });
    finish(g.name + ' rejected', 'The owner will be emailed the reason.', true);
  };
  return (
    <Modal
      open={true}
      onClose={onClose}
      size="md"
      title={'Review ' + g.name}
      sub={g.id + ' · submitted ' + g.on}
      footer={
        <>
          <Btn onClick={onClose}>Close</Btn>
          {perms.editGym && g.status !== 'Approved' && !rejecting && (
            <Btn onClick={() => setRejecting(true)}>Reject</Btn>
          )}
          {perms.editGym && g.status === 'Pending' && !rejecting && (
            <Btn v="soft" onClick={startReview}>
              Start review
            </Btn>
          )}
          {perms.editGym && g.status !== 'Approved' && (
            <Btn v="primary" disabled={verified < DOCS.length || rejecting} onClick={approve}>
              Approve gym
            </Btn>
          )}
          {g.status === 'Approved' && (
            <span className="text-xs font-medium text-emerald-600 self-center px-2 py-1 bg-emerald-50 rounded">
              Gym Approved
            </span>
          )}
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Location</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <Icon n="MapPin" size={14} className="text-zinc-400" />
            {g.loc}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Owner</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <Icon n="User" size={14} className="text-zinc-400" />
            {g.owner}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Submitted on</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{g.on}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Status</dt>
          <dd className="mt-0.5">
            <ApprovalBadge s={g.status} />
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Documents</p>
          <span className="text-xs tabular-nums text-zinc-500">
            {verified} of {DOCS.length} verified
          </span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: (verified / DOCS.length) * 100 + '%' }}
          ></div>
        </div>
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {DOCS.map((d, i) => {
            const docInfo = docs[d];
            const hasData = Boolean(docInfo?.url || docInfo?.name || docInfo);
            const isChecked = hasData || checks[i];
            const isUp = uploading[d];
            return (
              <li key={d} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-zinc-50/60">
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    id={'doc-' + i}
                    type="checkbox"
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                    disabled={!perms.editGym || isUp}
                    checked={isChecked}
                    onChange={() => {
                      if (!hasData) {
                        document.getElementById('file-input-' + i)?.click();
                      } else {
                        handleRemove(d, i);
                      }
                    }}
                  />
                  <div className="min-w-0">
                    <span className={isChecked ? 'font-medium text-zinc-950' : 'text-zinc-600'}>
                      {d}
                    </span>
                    {hasData && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                        <Icon n="FileText" size={12} className="text-emerald-600 shrink-0" />
                        <a
                          href={docInfo.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate max-w-[200px] text-[11px] font-mono text-emerald-600 hover:underline"
                          title={docInfo.name || 'View document'}
                        >
                          {docInfo.name || 'View document'}
                        </a>
                        {docInfo.size && (
                          <span className="text-[10px] text-zinc-400">
                            ({(docInfo.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    id={'file-input-' + i}
                    type="file"
                    className="hidden"
                    disabled={!perms.editGym || isUp}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(d, file, i);
                      e.target.value = '';
                    }}
                  />

                  {isUp ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                      <Icon n="Loader2" size={13} className="animate-spin text-emerald-500" />
                      Uploading...
                    </span>
                  ) : hasData ? (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={'file-input-' + i}
                        className="cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="Upload a new version of this document"
                      >
                        Replace
                      </label>
                      <Badge tone="green">Verified</Badge>
                    </div>
                  ) : (
                    <label
                      htmlFor={'file-input-' + i}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                    >
                      <Icon n="Upload" size={12} className="text-zinc-500" />
                      <span>Upload</span>
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <Field label="Internal note" id="rv-note" className="mt-4">
        <textarea
          id="rv-note"
          rows="2"
          disabled={!perms.editGym}
          className={cx(inputCls, 'h-auto py-2')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Visible to admins only"
        ></textarea>
      </Field>
      {rejecting && (
        <div className="mt-4 space-y-3 rounded-lg border-2 border-zinc-950 p-3">
          <Field label="Reason for rejection" id="rv-reason">
            <input
              id="rv-reason"
              className={inputCls}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Insurance certificate has expired"
            />
          </Field>
          <div className="flex gap-2">
            <Btn v="dark" disabled={!reason.trim()} onClick={reject}>
              Confirm rejection
            </Btn>
            <Btn
              v="ghost"
              onClick={() => {
                setRejecting(false);
                setReason('');
              }}
            >
              Cancel
            </Btn>
          </div>
        </div>
      )}
      {!perms.editGym && (
        <p className="mt-4 text-xs text-zinc-500">
          View only for your role. Switch to Branch Manager or Super Admin to approve or reject.
        </p>
      )}
    </Modal>
  );
}

export function GymManagement() {
  const { perms, approvals, approvedN, openGym, gyms } = useApp();
  const [review, setReview] = useState(null);
  const isPend = (g) => {
    const s = (g?.status || '').toLowerCase().replace(/[\s_]+/g, '');
    return s === 'pending' || s === 'underreview';
  };
  const n = (v) => v.toLocaleString('en-US');
  const totalGyms = Object.keys(gyms || {}).length;
  const activeGyms = Object.values(gyms || {}).filter((g) => g.status === 'approved' || g.is_open).length;
  const kpis = [
    { label: 'Total Gyms', value: n(totalGyms), icon: 'Building2', trend: 'Live', period: 'Real-time' },
    { label: 'Active Gyms', value: n(activeGyms), icon: 'CheckCircle2', trend: 'Live', period: 'Real-time' },
    { label: 'Flagged Reviews', value: '0', icon: 'Flag', trend: '0%', down: false, period: 'Real-time' },
    {
      label: 'Revenue',
      value: '₹0',
      icon: 'IndianRupee',
      trend: 'Live',
      period: 'Real-time',
      locked: !perms.revenue,
    },
  ];
  const toIso = (d) => {
    if (!d || typeof d !== 'string') return '';
    if (d.includes('-')) return d.split('T')[0];
    const parts = d.split('/');
    if (parts.length === 3) {
      const [m, dd, y] = parts;
      return y + '-' + m.padStart(2, '0') + '-' + dd.padStart(2, '0');
    }
    return d;
  };
  const rows = (approvals || []).map((a) => {
    const rawDate = a.on || a.created_at || '';
    let displayDate = a.on;
    if (!displayDate && a.created_at) {
      try {
        const dt = new Date(a.created_at);
        displayDate = !isNaN(dt.getTime())
          ? `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`
          : a.created_at.split('T')[0];
      } catch (e) {
        displayDate = '';
      }
    }
    const rawStatus = (a.status || 'Pending').toLowerCase().replace(/[\s_]+/g, '');
    const titleStatus =
      rawStatus === 'approved'
        ? 'Approved'
        : rawStatus === 'rejected'
        ? 'Rejected'
        : rawStatus === 'underreview'
        ? 'Under Review'
        : 'Pending';

    return {
      ...a,
      id: a.id || a.registration_number,
      name: a.name || a.gym_name || 'Gym',
      loc: a.loc || a.city || a.address || '',
      owner: a.owner || a.owner_name || 'Gym Owner',
      email: a.email || a.owner_email || '',
      phone: a.phone || a.owner_phone || '',
      status: titleStatus,
      on: displayDate || 'Today',
      iso: toIso(rawDate || displayDate),
      internal_note: a.internal_note || a.note || '',
      documents: a.documents || {},
    };
  });
  const live = review ? rows.find((a) => a.id === review) : null;
  const cnt = (k) => rows.filter((a) => a.status === k).length;
  const cols = [
    {
      id: 'name',
      label: 'Gym name',
      type: 'text',
      w: 220,
      get: (g) => g.name + ' ' + g.id,
      render: (g) => (
        <div>
          <button
            className="text-left font-medium text-foreground underline-offset-2 hover:text-emerald-600 hover:underline"
            onClick={() => openGym(g.gym_id || g.id)}
          >
            {g.name}
          </button>
          <NameTick id={g.gym_id || g.id} is_verified={g.is_verified} verified={g.verified} />
          <p className="text-xs text-muted-foreground font-mono">{g.registration_number || g.reg_code || g.code || 'GYM001'}</p>
        </div>
      ),
    },
    {
      id: 'loc',
      label: 'Location',
      type: 'select',
      get: (g) => g.loc,
      render: (g) => (
        <span className="inline-flex items-center gap-2">
          <Icon n="MapPin" size={15} className="text-zinc-400" />
          {g.loc}
        </span>
      ),
    },
    {
      id: 'owner',
      label: 'Owner',
      type: 'select',
      get: (g) => g.owner,
      render: (g) => (
        <span className="inline-flex items-center gap-2">
          <Icon n="User" size={15} className="text-zinc-400" />
          {g.owner}
        </span>
      ),
    },
    {
      id: 'on',
      label: 'Submitted on',
      type: 'range',
      get: (g) => g.iso,
      render: (g) => (
        <span className="inline-flex items-center gap-2 tabular-nums">
          <Icon n="Calendar" size={15} className="text-zinc-400" />
          {g.on}
        </span>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      get: (g) => g.status,
      render: (g) => <ApprovalBadge s={g.status} />,
    },
    {
      id: 'act',
      label: 'Action',
      type: 'select',
      get: (g) => (isPend(g) ? 'Needs review' : 'Reviewed'),
      render: (g) => (
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            onClick={() => setReview(g.id)}
            title="Review documents and registration"
          >
            Review
            <Icon n="ArrowRight" size={14} />
          </button>
          <button
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => openGym(g.gym_id || g.id)}
            title="View gym details"
          >
            Details
          </button>
        </div>
      ),
    },
  ];
  return (
    <div>
      <PageHead title="All Gyms" sub="Monitor every registered gym, review new registrations and see approved gyms" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Gym registrations</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Pending, approved and rejected gyms in one list. Use the filters under each heading.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="black" className="tabular-nums">
            {cnt('Pending')} pending
          </Badge>
          <Badge tone="green" className="tabular-nums">
            {cnt('Under Review')} under review
          </Badge>
          <Badge tone="solid" className="tabular-nums">
            {cnt('Approved')} approved
          </Badge>
          <Badge tone="outline" className="tabular-nums">
            {cnt('Rejected')} rejected
          </Badge>
        </div>
      </div>
      <DataTable cols={cols} rows={rows} noun="gyms" />
      {live && <ReviewModal key={live.id} g={live} onClose={() => setReview(null)} />}
    </div>
  );
}
