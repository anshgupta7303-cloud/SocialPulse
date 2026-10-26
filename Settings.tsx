import React, { useState } from 'react';
import {
  Sliders,
  Save,
  CheckCircle,
  HelpCircle,
  Instagram,
  Sparkles,
  Info,
  Trash2,
  AlertTriangle,
  User,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Badge,
  Modal,
} from '../components/ui/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { PostFormat } from '../types/index.ts';

export function Settings() {
  const {
    profile,
    updateProfile,
    useSampleData,
    currentUser,
    setIsAuthModalOpen,
    clearImportedData,
    importedPosts,
  } = useApp();

  const [brandName, setBrandName] = useState(profile.brandName);
  const [instagramHandle, setInstagramHandle] = useState(profile.instagramHandle);
  const [niche, setNiche] = useState(profile.niche);
  const [targetAudience, setTargetAudience] = useState(profile.targetAudience);
  const [preferredFormats, setPreferredFormats] = useState<PostFormat[]>(profile.preferredFormats);
  const [tone, setTone] = useState(profile.tone);
  const [goals, setGoals] = useState(profile.goals);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Sync if profile changes (e.g. sample toggle or auth login)
  React.useEffect(() => {
    setBrandName(profile.brandName);
    setInstagramHandle(profile.instagramHandle);
    setNiche(profile.niche);
    setTargetAudience(profile.targetAudience);
    setPreferredFormats(profile.preferredFormats);
    setTone(profile.tone);
    setGoals(profile.goals);
  }, [profile]);

  const handleToggleFormat = (fmt: PostFormat) => {
    if (preferredFormats.includes(fmt)) {
      if (preferredFormats.length > 1) {
        setPreferredFormats(preferredFormats.filter((f) => f !== fmt));
      }
    } else {
      setPreferredFormats([...preferredFormats, fmt]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!brandName.trim()) {
      newErrors.brandName = 'Brand / Creator name is required.';
    }
    if (!niche.trim()) {
      newErrors.niche = 'Niche category is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSavedSuccess(false);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await updateProfile({
        brandName,
        instagramHandle,
        niche,
        targetAudience,
        preferredFormats,
        tone,
        goals,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await clearImportedData();
      setIsDeleteModalOpen(false);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Creator Profile & Account Settings
            </h2>
            {useSampleData && <Badge variant="sample">SAMPLE DATA</Badge>}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure brand parameters used to guide content hypotheses, tone constraints, and Supabase persistence.
          </p>
        </div>
      </div>

      {/* Supabase Account Status Banner */}
      {currentUser ? (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Connected to Supabase with Row Level Security
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Logged in as <span className="font-mono font-medium">{currentUser.email}</span> (User ID: <span className="font-mono">{currentUser.id.slice(0, 8)}...</span>)
              </p>
            </div>
          </div>
          <Badge variant="emerald">Authenticated</Badge>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Not signed in to Supabase
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Settings and imported posts are stored in local session memory. Sign in to sync across devices.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            leftIcon={<LogIn className="w-3.5 h-3.5" />}
            onClick={() => setIsAuthModalOpen(true)}
          >
            Sign In
          </Button>
        </div>
      )}

      {/* Main Profile Settings Form */}
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Creator Profile Parameters</CardTitle>
            <CardDescription>
              Persisted in Supabase <code className="font-mono text-emerald-600 dark:text-emerald-400">profiles</code> table isolated to your user ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {savedSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Creator profile parameters successfully updated and saved!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Brand or Creator Name *"
                placeholder="e.g. NextWave Growth Lab"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                error={errors.brandName}
              />

              <div className="space-y-1.5">
                <Input
                  label="Instagram Handle (Optional)"
                  placeholder="e.g. @alexcreates"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  leftIcon={<Instagram className="w-4 h-4 text-slate-400" />}
                />
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5" />
                  Handle only, not connected to Instagram
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Content Niche / Primary Domain *"
                placeholder="e.g. AI Workflow Automation & Solopreneur Systems"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                error={errors.niche}
              />

              <Input
                label="Target Audience Demographics & Persona"
                placeholder="e.g. Solopreneurs, agency owners, 24-42"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            {/* Preferred Formats */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Preferred Content Formats (Select one or more)
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'reel', label: 'Reels (Short Video)' },
                  { id: 'carousel', label: 'Carousels (Multi-slide)' },
                  { id: 'static_image', label: 'Static Images / Infographics' },
                  { id: 'story', label: 'Stories' },
                ].map((fmt) => {
                  const isChecked = preferredFormats.includes(fmt.id as PostFormat);
                  return (
                    <button
                      type="button"
                      key={fmt.id}
                      onClick={() => handleToggleFormat(fmt.id as PostFormat)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Brand Tone & Voice Guidelines"
              placeholder="e.g. Pragmatic, actionable, transparent, high-density"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />

            <Textarea
              label="Growth Goals & Quarterly Objectives"
              placeholder="e.g. Grow to 40k reach/post and increase save rate above 4%..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Settings
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Danger Zone: Data Management */}
      <Card className="border-rose-200 dark:border-rose-900/50">
        <CardHeader>
          <CardTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Data Management & Privacy
          </CardTitle>
          <CardDescription>
            Permanently clear your imported post metrics from the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          {deleteSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>All imported posts have been deleted from your database account.</span>
            </div>
          )}
          <p>
            You currently have <strong>{importedPosts.length}</strong> imported post record(s) in your profile.
            Sample dataset records are never written to the database and will not be affected.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            disabled={importedPosts.length === 0}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete All My Imported Data
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Data Deletion"
        description="Are you sure you want to delete all imported post records?"
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Warning:</strong> This will delete all <strong>{importedPosts.length}</strong> imported post records associated with your user ID in Supabase. This action cannot be undone.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Yes, Delete All Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
