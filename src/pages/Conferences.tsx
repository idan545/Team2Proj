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
import { Switch } from '@/components/ui/switch';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Conference {
  id: string;
  name_he: string;
  name_en: string;
  description_he: string | null;
  description_en: string | null;
  location_he: string | null;
  location_en: string | null;
  event_date: string;
  is_active: boolean | null;
  created_at: string | null;
  expertise_areas: string[] | null;
  created_by: string | null;
}

const EXPERTISE_OPTIONS = [
  { value: 'frontend', labelHe: 'פיתוח Frontend', labelEn: 'Frontend Development' },
  { value: 'backend', labelHe: 'פיתוח Backend', labelEn: 'Backend Development' },
  { value: 'fullstack', labelHe: 'פיתוח Full Stack', labelEn: 'Full Stack Development' },
  { value: 'mobile', labelHe: 'פיתוח מובייל', labelEn: 'Mobile Development' },
  { value: 'devops', labelHe: 'DevOps', labelEn: 'DevOps' },
  { value: 'security', labelHe: 'אבטחת מידע', labelEn: 'Cybersecurity' },
  { value: 'ai_ml', labelHe: 'בינה מלאכותית / למידת מכונה', labelEn: 'AI / Machine Learning' },
  { value: 'data', labelHe: 'מדעי הנתונים', labelEn: 'Data Science' },
  { value: 'cloud', labelHe: 'תשתיות ענן', labelEn: 'Cloud Infrastructure' },
  { value: 'ux_ui', labelHe: 'עיצוב UX/UI', labelEn: 'UX/UI Design' },
  { value: 'database', labelHe: 'בסיסי נתונים', labelEn: 'Databases' },
  { value: 'testing', labelHe: 'בדיקות תוכנה', labelEn: 'Software Testing' },
];

const emptyConference: Omit<Conference, 'id' | 'created_at' | 'created_by'> = {
  name_he: '',
  name_en: '',
  description_he: '',
  description_en: '',
  location_he: '',
  location_en: '',
  event_date: new Date().toISOString().split('T')[0],
  is_active: true,
  expertise_areas: [],
};

export default function Conferences() {
  const { user, isAdmin, roles, isLoading: authLoading } = useAuth();
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [formData, setFormData] = useState(emptyConference);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isDepartmentManager = roles.some(r => r.role === 'department_manager');

  const fetchConferences = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('conferences')
        .select('*')
        .order('event_date', { ascending: false });
      
      // Department managers can see all conferences
      // No filtering needed - all managers have full access
      
      const { data, error } = await query;

      if (error) throw error;
      setConferences(data || []);
    } catch (error) {
      console.error('Error fetching conferences:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'לא ניתן לטעון את רשימת הכנסים' : 'Failed to load conferences',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedConference(null);
    setFormData(emptyConference);
    setIsDialogOpen(true);
  };

  const openEditDialog = (conference: Conference) => {
    setSelectedConference(conference);
    setFormData({
      name_he: conference.name_he,
      name_en: conference.name_en,
      description_he: conference.description_he || '',
      description_en: conference.description_en || '',
      location_he: conference.location_he || '',
      location_en: conference.location_en || '',
      event_date: conference.event_date,
      is_active: conference.is_active ?? true,
      expertise_areas: conference.expertise_areas || [],
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (conference: Conference) => {
    setSelectedConference(conference);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name_he || !formData.name_en || !formData.event_date) {
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: language === 'he' ? 'יש למלא את כל השדות החובה' : 'Please fill in all required fields',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedConference) {
        // Update existing conference
        const { error } = await supabase
          .from('conferences')
          .update({
            name_he: formData.name_he,
            name_en: formData.name_en,
            description_he: formData.description_he || null,
            description_en: formData.description_en || null,
            location_he: formData.location_he || null,
            location_en: formData.location_en || null,
            event_date: formData.event_date,
            is_active: formData.is_active,
            expertise_areas: formData.expertise_areas || [],
          })
          .eq('id', selectedConference.id);

        if (error) throw error;

        toast({
          title: language === 'he' ? 'הכנס עודכן' : 'Conference Updated',
          description: language === 'he' ? 'פרטי הכנס עודכנו בהצלחה' : 'Conference details updated successfully',
        });
      } else {
        // Create new conference
        const { error } = await supabase
          .from('conferences')
          .insert({
            name_he: formData.name_he,
            name_en: formData.name_en,
            description_he: formData.description_he || null,
            description_en: formData.description_en || null,
            location_he: formData.location_he || null,
            location_en: formData.location_en || null,
            event_date: formData.event_date,
            is_active: formData.is_active,
            expertise_areas: formData.expertise_areas || [],
            created_by: user!.id,
          });

        if (error) throw error;

        toast({
          title: language === 'he' ? 'הכנס נוצר' : 'Conference Created',
          description: language === 'he' ? 'הכנס נוסף בהצלחה' : 'Conference added successfully',
        });
      }

      setIsDialogOpen(false);
      fetchConferences();
    } catch (error: any) {
      console.error('Error saving conference:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: error.message || (language === 'he' ? 'לא ניתן לשמור את הכנס' : 'Failed to save conference'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConference) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('conferences')
        .delete()
        .eq('id', selectedConference.id);

      if (error) throw error;

      toast({
        title: language === 'he' ? 'הכנס נמחק' : 'Conference Deleted',
        description: language === 'he' ? 'הכנס נמחק בהצלחה' : 'Conference deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      fetchConferences();
    } catch (error: any) {
      console.error('Error deleting conference:', error);
      toast({
        variant: 'destructive',
        title: language === 'he' ? 'שגיאה' : 'Error',
        description: error.message || (language === 'he' ? 'לא ניתן למחוק את הכנס' : 'Failed to delete conference'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredConferences = conferences.filter((conf) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conf.name_he.toLowerCase().includes(query) ||
      conf.name_en.toLowerCase().includes(query) ||
      conf.location_he?.toLowerCase().includes(query) ||
      conf.location_en?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'he' ? 'he-IL' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

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
            <h1 className="text-3xl font-bold">
              {language === 'he' ? 'ניהול כנסים' : 'Conference Management'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'he'
                ? 'הוספה, עריכה ומחיקה של כנסים'
                : 'Add, edit, and delete conferences'}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'he' ? 'כנס חדש' : 'New Conference'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'סה"כ כנסים' : 'Total Conferences'}
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conferences.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'כנסים פעילים' : 'Active Conferences'}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {conferences.filter((c) => c.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'he' ? 'כנסים לא פעילים' : 'Inactive Conferences'}
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {conferences.filter((c) => !c.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'he' ? 'חיפוש כנסים...' : 'Search conferences...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        {/* Conferences Table */}
        <Card>
          <CardContent className="p-0">
            {filteredConferences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {language === 'he' ? 'אין כנסים להצגה' : 'No conferences to display'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'he' ? 'שם' : 'Name'}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {language === 'he' ? 'מיקום' : 'Location'}
                    </TableHead>
                    <TableHead>{language === 'he' ? 'תאריך' : 'Date'}</TableHead>
                    <TableHead>{language === 'he' ? 'סטטוס' : 'Status'}</TableHead>
                    <TableHead>{language === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConferences.map((conference) => (
                    <TableRow key={conference.id}>
                      <TableCell className="font-medium">
                        {language === 'he' ? conference.name_he : conference.name_en}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {language === 'he'
                            ? conference.location_he || '-'
                            : conference.location_en || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(conference.event_date)}</TableCell>
                      <TableCell>
                        <Badge variant={conference.is_active ? 'default' : 'secondary'}>
                          {conference.is_active
                            ? language === 'he' ? 'פעיל' : 'Active'
                            : language === 'he' ? 'לא פעיל' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(conference)}
                            title={language === 'he' ? 'ערוך' : 'Edit'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(conference)}
                            title={language === 'he' ? 'מחק' : 'Delete'}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedConference
                ? language === 'he' ? 'עריכת כנס' : 'Edit Conference'
                : language === 'he' ? 'כנס חדש' : 'New Conference'}
            </DialogTitle>
            <DialogDescription>
              {language === 'he'
                ? 'מלא את פרטי הכנס בעברית ובאנגלית'
                : 'Fill in conference details in Hebrew and English'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name_he">
                  {language === 'he' ? 'שם (עברית)' : 'Name (Hebrew)'} *
                </Label>
                <Input
                  id="name_he"
                  value={formData.name_he}
                  onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_en">
                  {language === 'he' ? 'שם (אנגלית)' : 'Name (English)'} *
                </Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="description_he">
                  {language === 'he' ? 'תיאור (עברית)' : 'Description (Hebrew)'}
                </Label>
                <Textarea
                  id="description_he"
                  value={formData.description_he || ''}
                  onChange={(e) => setFormData({ ...formData, description_he: e.target.value })}
                  dir="rtl"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_en">
                  {language === 'he' ? 'תיאור (אנגלית)' : 'Description (English)'}
                </Label>
                <Textarea
                  id="description_en"
                  value={formData.description_en || ''}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  dir="ltr"
                  rows={3}
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_he">
                  {language === 'he' ? 'מיקום (עברית)' : 'Location (Hebrew)'}
                </Label>
                <Input
                  id="location_he"
                  value={formData.location_he || ''}
                  onChange={(e) => setFormData({ ...formData, location_he: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_en">
                  {language === 'he' ? 'מיקום (אנגלית)' : 'Location (English)'}
                </Label>
                <Input
                  id="location_en"
                  value={formData.location_en || ''}
                  onChange={(e) => setFormData({ ...formData, location_en: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Date and Status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event_date">
                  {language === 'he' ? 'תאריך הכנס' : 'Event Date'} *
                </Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'he' ? 'סטטוס' : 'Status'}</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <span className="text-sm">
                    {formData.is_active
                      ? language === 'he' ? 'פעיל' : 'Active'
                      : language === 'he' ? 'לא פעיל' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Expertise Areas */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {language === 'he' ? 'תחומי התמחות' : 'Expertise Areas'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map((option) => (
                  <Badge
                    key={option.value}
                    variant={formData.expertise_areas?.includes(option.value) ? 'default' : 'outline'}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const current = formData.expertise_areas || [];
                      const updated = current.includes(option.value)
                        ? current.filter(v => v !== option.value)
                        : [...current, option.value];
                      setFormData({ ...formData, expertise_areas: updated });
                    }}
                  >
                    {language === 'he' ? option.labelHe : option.labelEn}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'he' 
                  ? 'שופטים יראו רק כנסים התואמים לתחומי ההתמחות שלהם'
                  : 'Judges will only see conferences matching their expertise areas'}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedConference ? (
                language === 'he' ? 'עדכן' : 'Update'
              ) : (
                language === 'he' ? 'צור' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {language === 'he' ? 'מחיקת כנס' : 'Delete Conference'}
            </DialogTitle>
            <DialogDescription>
              {language === 'he'
                ? `האם אתה בטוח שברצונך למחוק את הכנס "${selectedConference?.name_he}"? פעולה זו אינה ניתנת לביטול.`
                : `Are you sure you want to delete "${selectedConference?.name_en}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              {language === 'he' ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 me-2" />
                  {language === 'he' ? 'מחק' : 'Delete'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
