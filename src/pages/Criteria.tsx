import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  Scale,
  Target,
  AlertCircle,
} from 'lucide-react';

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
  is_active: boolean;
}

interface Criterion {
  id: string;
  conference_id: string;
  name_he: string;
  name_en: string;
  description_he: string | null;
  description_en: string | null;
  max_score: number;
  weight: number;
  sort_order: number;
}

interface CriterionForm {
  name_he: string;
  name_en: string;
  description_he: string;
  description_en: string;
  max_score: number;
  weight: number;
}

const initialFormState: CriterionForm = {
  name_he: '',
  name_en: '',
  description_he: '',
  description_en: '',
  max_score: 10,
  weight: 1,
};

export default function Criteria() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { t, language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [selectedConference, setSelectedConference] = useState<string>('');
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [deletingCriterion, setDeletingCriterion] = useState<Criterion | null>(null);
  const [form, setForm] = useState<CriterionForm>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchConferences();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedConference) {
      fetchCriteria();
    }
  }, [selectedConference]);

  const fetchConferences = async () => {
    try {
      const { data, error } = await supabase
        .from('conferences')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;

      setConferences(data || []);
      if (data && data.length > 0) {
        const activeConference = data.find(c => c.is_active) || data[0];
        setSelectedConference(activeConference.id);
      }
    } catch (error) {
      console.error('Error fetching conferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCriteria = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('conference_id', selectedConference)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCriteria(data || []);
    } catch (error) {
      console.error('Error fetching criteria:', error);
    }
  };

  const handleOpenCreate = () => {
    setEditingCriterion(null);
    setForm(initialFormState);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (criterion: Criterion) => {
    setEditingCriterion(criterion);
    setForm({
      name_he: criterion.name_he,
      name_en: criterion.name_en,
      description_he: criterion.description_he || '',
      description_en: criterion.description_en || '',
      max_score: criterion.max_score,
      weight: criterion.weight,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (criterion: Criterion) => {
    setDeletingCriterion(criterion);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_he || !form.name_en) {
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'יש למלא את שם הקריטריון' : 'Criterion name is required',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingCriterion) {
        // Update
        const { error } = await supabase
          .from('evaluation_criteria')
          .update({
            name_he: form.name_he,
            name_en: form.name_en,
            description_he: form.description_he || null,
            description_en: form.description_en || null,
            max_score: form.max_score,
            weight: form.weight,
          })
          .eq('id', editingCriterion.id);

        if (error) throw error;

        toast({
          title: language === 'he' ? 'הקריטריון עודכן' : 'Criterion Updated',
        });
      } else {
        // Create
        const maxSortOrder = criteria.length > 0 
          ? Math.max(...criteria.map(c => c.sort_order)) + 1 
          : 0;

        const { error } = await supabase
          .from('evaluation_criteria')
          .insert({
            conference_id: selectedConference,
            name_he: form.name_he,
            name_en: form.name_en,
            description_he: form.description_he || null,
            description_en: form.description_en || null,
            max_score: form.max_score,
            weight: form.weight,
            sort_order: maxSortOrder,
          });

        if (error) throw error;

        toast({
          title: language === 'he' ? 'הקריטריון נוצר' : 'Criterion Created',
        });
      }

      setIsDialogOpen(false);
      fetchCriteria();
    } catch (error) {
      console.error('Error saving criterion:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לשמור את הקריטריון' : 'Failed to save criterion',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCriterion) return;

    try {
      const { error } = await supabase
        .from('evaluation_criteria')
        .delete()
        .eq('id', deletingCriterion.id);

      if (error) throw error;

      toast({
        title: language === 'he' ? 'הקריטריון נמחק' : 'Criterion Deleted',
      });

      setIsDeleteDialogOpen(false);
      fetchCriteria();
    } catch (error) {
      console.error('Error deleting criterion:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן למחוק את הקריטריון' : 'Failed to delete criterion',
      });
    }
  };

  const getConferenceName = (conf: Conference) =>
    language === 'he' ? conf.name_he : conf.name_en;

  const getCriterionName = (c: Criterion) =>
    language === 'he' ? c.name_he : c.name_en;

  const getCriterionDescription = (c: Criterion) =>
    language === 'he' ? c.description_he : c.description_en;

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('admin.manageCriteria')}</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'הגדרת קריטריוני הערכה עם משקלות וציון מקסימלי'
                : 'Define evaluation criteria with weights and maximum scores'}
            </p>
          </div>
          <Button onClick={handleOpenCreate} disabled={!selectedConference} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'he' ? 'קריטריון חדש' : 'New Criterion'}
          </Button>
        </div>

        {/* Conference Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Label className="shrink-0">
                {language === 'he' ? 'בחר כנס:' : 'Select Conference:'}
              </Label>
              <Select value={selectedConference} onValueChange={setSelectedConference}>
                <SelectTrigger className="w-full sm:w-[300px]">
                  <SelectValue placeholder={language === 'he' ? 'בחר כנס' : 'Select conference'} />
                </SelectTrigger>
                <SelectContent>
                  {conferences.map((conf) => (
                    <SelectItem key={conf.id} value={conf.id}>
                      <span className="flex items-center gap-2">
                        {getConferenceName(conf)}
                        {conf.is_active && (
                          <Badge variant="default" className="text-xs">
                            {language === 'he' ? 'פעיל' : 'Active'}
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'מספר קריטריונים' : 'Number of Criteria'}
              </CardTitle>
              <ListChecks className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{criteria.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סה"כ משקל' : 'Total Weight'}
              </CardTitle>
              <Scale className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWeight}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'ציון מקסימלי ממוצע' : 'Avg Max Score'}
              </CardTitle>
              <Target className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {criteria.length > 0
                  ? Math.round(criteria.reduce((sum, c) => sum + c.max_score, 0) / criteria.length)
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Criteria Table */}
        <Card>
          <CardContent className="p-0">
            {conferences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  {language === 'he'
                    ? 'אין כנסים במערכת. יש ליצור כנס לפני הוספת קריטריונים.'
                    : 'No conferences in the system. Please create a conference first.'}
                </p>
                <Button onClick={() => navigate('/conferences')} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {language === 'he' ? 'צור כנס חדש' : 'Create Conference'}
                </Button>
              </div>
            ) : criteria.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ListChecks className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  {language === 'he'
                    ? 'לא הוגדרו קריטריונים לכנס זה'
                    : 'No criteria defined for this conference'}
                </p>
                <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {language === 'he' ? 'הוסף קריטריון ראשון' : 'Add First Criterion'}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {language === 'he' ? 'תיאור' : 'Description'}
                    </TableHead>
                    <TableHead className="text-center">
                      {language === 'he' ? 'ציון מקס' : 'Max Score'}
                    </TableHead>
                    <TableHead className="text-center">
                      {language === 'he' ? 'משקל' : 'Weight'}
                    </TableHead>
                    <TableHead className="text-center">
                      {language === 'he' ? 'אחוז' : 'Percent'}
                    </TableHead>
                    <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((criterion, index) => (
                    <TableRow key={criterion.id}>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getCriterionName(criterion)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        <span className="line-clamp-1">
                          {getCriterionDescription(criterion) || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{criterion.max_score}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{criterion.weight}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {totalWeight > 0
                          ? `${Math.round((criterion.weight / totalWeight) * 100)}%`
                          : '0%'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(criterion)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDelete(criterion)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {editingCriterion
                ? language === 'he' ? 'עריכת קריטריון' : 'Edit Criterion'
                : language === 'he' ? 'קריטריון חדש' : 'New Criterion'}
            </DialogTitle>
            <DialogDescription>
              {language === 'he'
                ? 'הגדר את פרטי הקריטריון להערכה'
                : 'Define the evaluation criterion details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'שם (עברית)' : 'Name (Hebrew)'} *</Label>
                <Input
                  value={form.name_he}
                  onChange={(e) => setForm({ ...form, name_he: e.target.value })}
                  placeholder={language === 'he' ? 'שם הקריטריון' : 'Criterion name'}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'שם (אנגלית)' : 'Name (English)'} *</Label>
                <Input
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  placeholder="Criterion name"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'he' ? 'תיאור (עברית)' : 'Description (Hebrew)'}</Label>
                <Textarea
                  value={form.description_he}
                  onChange={(e) => setForm({ ...form, description_he: e.target.value })}
                  placeholder={language === 'he' ? 'תיאור הקריטריון' : 'Criterion description'}
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'תיאור (אנגלית)' : 'Description (English)'}</Label>
                <Textarea
                  value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                  placeholder="Criterion description"
                  rows={2}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {language === 'he' ? 'ציון מקסימלי' : 'Maximum Score'}
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.max_score}
                  onChange={(e) => setForm({ ...form, max_score: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  {language === 'he' ? 'משקל' : 'Weight'}
                </Label>
                <Input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {language === 'he' ? 'מחיקת קריטריון' : 'Delete Criterion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'he'
                ? `האם אתה בטוח שברצונך למחוק את הקריטריון "${deletingCriterion?.name_he}"? פעולה זו לא ניתנת לביטול.`
                : `Are you sure you want to delete the criterion "${deletingCriterion?.name_en}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
