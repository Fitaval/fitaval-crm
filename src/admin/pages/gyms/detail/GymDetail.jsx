import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApprovalBadge } from '../../../components/ApprovalBadge';
import { LogoTile } from '../../../components/GymVisuals';
import { Icon } from '../../../components/Icon';
import { Stars } from '../../../components/Stars';
import { Btn } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Locked } from '../../../components/ui/PageHead';
import { Tabs } from '../../../components/ui/Tabs';
import { useApp } from '../../../context/AppContext';
import { avgRating } from '../../../lib/gym';
import { ReviewModal } from '../GymManagement';
import VerifiedTick from '../../../../shared/VerifiedTick';
import { useVerified, setVerified } from '../../../../shared/verified';
import { GymFinanceTab } from './GymFinanceTab';
import { ServicesModal, HoursEditModal, LocationModal, PhotosModal } from './GymModals';
import { GymStaffTab, GymTrainersTab, GymMembersTab } from './GymPeopleTabs';
import { GymReviewsTab } from './GymReviewsTab';
import { GymWalletTab } from './GymWalletTab';
import { OverviewTab } from './OverviewTab';

export function GymDetail({ routeGymId }) {
  const { gymId: paramGymId } = useParams() || {};
  const { gymId: ctxGymId, gyms, approvals, setSection, perms, toast, openGym, updateGym, client, loading } = useApp();
  const gymId = routeGymId || paramGymId || ctxGymId;
  const gym = gyms[gymId] || (gyms && Object.keys(gyms).length > 0 ? (gyms[gymId] || Object.values(gyms)[0]) : null);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [review, setReview] = useState(false);
  const localVerified = useVerified(gymId);
  const verified = Boolean(gym?.is_verified ?? gym?.verified ?? localVerified);
  const currentGymId = gym?.id || gymId;

  useEffect(() => {
    setTab('overview');
    setModal(null);
    if (currentGymId && openGym && (!gym?.members || gym.members.length === 0)) {
      openGym(currentGymId, false);
    }
  }, [currentGymId]);

  if (!gym && loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Icon n="Loader2" size={32} className="animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-medium">Loading gym details...</p>
      </div>
    );
  }

  if (!gym) return <Locked title="Gym not found" text="Go back to All Gyms and pick a gym from the list." />;

  const ownerObj = typeof gym.owner === 'object' ? gym.owner : null;
  const ownerName = ownerObj?.name || (typeof gym.owner === 'string' ? gym.owner : (gym.owner_name || 'Gym Owner'));
  const ownerEmail = ownerObj?.email || gym.contact_email || gym.email || gym.owner_email || '';
  const ownerPhone = ownerObj?.phone || gym.contact_phone || gym.phone || gym.owner_phone || '';

  const g = {
    ...gym,
    staff: Array.isArray(gym.staff) ? gym.staff : [],
    trainers: Array.isArray(gym.trainers) ? gym.trainers : [],
    members: Array.isArray(gym.members) ? gym.members : [],
    reviews: Array.isArray(gym.reviews) ? gym.reviews : [],
    txns: Array.isArray(gym.txns) ? gym.txns : [],
    facilities: Array.isArray(gym.facilities) ? gym.facilities : [],
    services: Array.isArray(gym.services) ? gym.services : [],
    photos: Array.isArray(gym.photos) ? gym.photos : [],
    logo_url: gym.logo_url || (Array.isArray(gym.photos) ? (gym.photos.find((p) => p.is_thumbnail)?.url || gym.photos.find((p) => p.is_thumbnail)?.src) : '') || '',
    hours: Array.isArray(gym.hours) ? gym.hours : [],
    loc: gym.loc || gym.city || gym.address || 'Kerala',
    owner: ownerName,
    owner_obj: ownerObj,
    owner_email: ownerEmail,
    owner_phone: ownerPhone,
    email: gym.email || gym.contact_email || ownerEmail,
    phone: gym.phone || gym.contact_phone || ownerPhone,
    code: gym.registration_number || gym.reg_code || gym.code || 'GYM001',
  };

  const staffCount = g.staff.length || gym.staff_count || 0;
  const trainersCount = g.trainers.length || gym.trainers_count || 0;
  const membersCount = g.members.length || gym.member_count || 0;
  const reviewsCount = g.reviews.length || gym.review_count || 0;
  const txnsCount = g.txns.length || 0;

  const ap = approvals.find((a) => a.id === g.id || a.gym_id === g.id);
  const edit = perms.editGym;
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'staff', label: 'Staff (' + staffCount + ')', icon: 'BriefcaseBusiness' },
    { id: 'trainers', label: 'Trainers (' + trainersCount + ')', icon: 'Dumbbell' },
    { id: 'members', label: 'Members (' + membersCount + ')', icon: 'Users', lock: !perms.members },
    { id: 'reviews', label: 'Reviews (' + reviewsCount + ')', icon: 'Star' },
    { id: 'finance', label: 'Finance (' + txnsCount + ')', icon: 'Receipt', lock: !perms.revenue },
    { id: 'wallet', label: 'Wallet', icon: 'Wallet', lock: !perms.revenue },
  ];
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-1.5 text-sm text-zinc-500">
        <button onClick={() => setSection('gym')} className="shrink-0 hover:text-zinc-950">
          Gym Management
        </button>
        <Icon n="ChevronRight" size={14} className="shrink-0" />
        <button onClick={() => setSection('gym')} className="shrink-0 hover:text-zinc-950">
          All Gyms
        </button>
        <Icon n="ChevronRight" size={14} className="shrink-0" />
        <span className="truncate font-medium text-zinc-950">{g.name}</span>
      </nav>
      <Card className="mb-4 p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Btn size="sm" v="outline" onClick={() => setSection('gym')}>
            <Icon n="ArrowLeft" size={14} />
            Back to all gyms
          </Btn>
          <div className="flex items-center gap-2">
            {edit && (
              <Btn
                size="sm"
                v={verified ? 'soft' : 'outline'}
                aria-pressed={verified}
                onClick={async () => {
                  const nextState = !verified;
                  setVerified(g.id, nextState);
                  if (g.registration_number) setVerified(g.registration_number, nextState);
                  if (g.reg_code) setVerified(g.reg_code, nextState);
                  if (g.code) setVerified(g.code, nextState);
                  setVerified('GYM001', nextState);
                  if (updateGym) updateGym(g.id, { verified: nextState, is_verified: nextState });
                  if (client?.gyms?.verify) {
                    try {
                      await client.gyms.verify(g.id, nextState);
                    } catch (e) {
                      console.warn('Backend gym verify call failed:', e);
                    }
                  }
                  toast({
                    title: nextState ? 'Gym verified' : 'Blue tick removed',
                    desc: g.name + (nextState ? ' now shows a blue tick in its CRM.' : ' is no longer shown as verified.'),
                  });
                }}
              >
                <Icon n="BadgeCheck" size={14} />
                {verified ? 'Verified · Remove tick' : 'Give blue tick'}
              </Btn>
            )}
            {ap && <ApprovalBadge s={ap.status} />}
            {ap && (ap.status === 'Pending' || ap.status === 'Under Review') && (
              <Btn size="sm" v="primary" onClick={() => setReview(true)}>
                <Icon n="ClipboardCheck" size={14} />
                Review and approve
              </Btn>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <LogoTile name={g.name} logoUrl={g.logo_url} />
          <h1 className="mt-3 inline-flex items-center gap-1.5 text-xl font-semibold tracking-tight">
            {g.name}
            {verified && <VerifiedTick size={20} />}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <Icon n="MapPin" size={14} className="text-emerald-600" />
            {g.loc}
            <span className="text-zinc-300">·</span>
            {g.code || g.registration_number || g.reg_code || 'GYM001'}
            <span className="text-zinc-300">·</span>Owner {g.owner}
          </p>
          <button
            onClick={() => setTab('reviews')}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm hover:bg-zinc-100"
            aria-label="View reviews"
          >
            <Stars v={avgRating(g.reviews || [])} />
            <span className="font-semibold tabular-nums">{avgRating(g.reviews || []).toFixed(1)}</span>
            <span className="text-zinc-500">({(g.reviews || []).length} reviews)</span>
          </button>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              ['staff', 'Staff', staffCount, 'BriefcaseBusiness'],
              ['trainers', 'Trainers', trainersCount, 'Dumbbell'],
              ['members', 'Members', membersCount, 'Users'],
            ].map(([id, l, n, ic]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-sm hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Icon n={ic} size={14} className="text-emerald-600" />
                <span className="font-semibold tabular-nums">{n}</span>
                <span className="text-zinc-600">{l}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
      <div className="mb-5">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>
      {tab === 'overview' && <OverviewTab g={g} edit={edit} setModal={setModal} />}
      {tab === 'staff' && <GymStaffTab g={g} />}
      {tab === 'trainers' && <GymTrainersTab g={g} />}
      {tab === 'members' && <GymMembersTab g={g} />}
      {tab === 'reviews' && <GymReviewsTab g={g} />}
      {tab === 'finance' && <GymFinanceTab g={g} />}
      {tab === 'wallet' && <GymWalletTab g={g} />}
      {modal === 'services' && <ServicesModal g={g} onClose={() => setModal(null)} />}
      {modal === 'hours' && <HoursEditModal g={g} onClose={() => setModal(null)} />}
      {modal === 'location' && <LocationModal g={g} onClose={() => setModal(null)} />}
      {modal === 'photos' && <PhotosModal g={g} onClose={() => setModal(null)} />}
      {review && ap && <ReviewModal g={ap} onClose={() => setReview(false)} onDone={() => setSection('gym')} />}
    </div>
  );
}
