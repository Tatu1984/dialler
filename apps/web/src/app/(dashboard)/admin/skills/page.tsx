'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  MoreVertical,
  Star,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  agentCount: number;
  createdAt: string;
}

interface AgentSkill {
  id: string;
  name: string;
  email: string;
  proficiency: number;
}

// Mock data
const MOCK_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'English',
    description: 'English language proficiency',
    category: 'Language',
    agentCount: 45,
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    name: 'Spanish',
    description: 'Spanish language proficiency',
    category: 'Language',
    agentCount: 23,
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    name: 'French',
    description: 'French language proficiency',
    category: 'Language',
    agentCount: 12,
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    name: 'Sales',
    description: 'Sales techniques and closing deals',
    category: 'Expertise',
    agentCount: 38,
    createdAt: '2024-01-15',
  },
  {
    id: '5',
    name: 'Technical Support',
    description: 'Technical troubleshooting and support',
    category: 'Expertise',
    agentCount: 28,
    createdAt: '2024-01-15',
  },
  {
    id: '6',
    name: 'Customer Service',
    description: 'Customer service excellence',
    category: 'Expertise',
    agentCount: 42,
    createdAt: '2024-01-15',
  },
  {
    id: '7',
    name: 'Collections',
    description: 'Debt collection strategies',
    category: 'Expertise',
    agentCount: 15,
    createdAt: '2024-01-20',
  },
  {
    id: '8',
    name: 'Product Knowledge',
    description: 'Deep understanding of products/services',
    category: 'Expertise',
    agentCount: 35,
    createdAt: '2024-01-20',
  },
];

const MOCK_AGENT_SKILLS: AgentSkill[] = [
  { id: '1', name: 'John Doe', email: 'john.doe@company.com', proficiency: 9 },
  { id: '2', name: 'Sarah Smith', email: 'sarah.smith@company.com', proficiency: 8 },
  { id: '3', name: 'Mike Johnson', email: 'mike.j@company.com', proficiency: 7 },
  { id: '4', name: 'Emily Davis', email: 'emily.d@company.com', proficiency: 8 },
  { id: '5', name: 'Robert Brown', email: 'robert.b@company.com', proficiency: 6 },
];

const CATEGORIES = [
  { value: 'Language', label: 'Language' },
  { value: 'Expertise', label: 'Expertise' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Soft Skills', label: 'Soft Skills' },
];

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>(MOCK_SKILLS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
  });

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
    });
  };

  const handleCreateSkill = () => {
    const newSkill: Skill = {
      id: String(skills.length + 1),
      name: formData.name,
      description: formData.description,
      category: formData.category,
      agentCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSkills([...skills, newSkill]);
    setCreateDialogOpen(false);
    resetForm();
    toast({
      title: 'Skill created',
      description: `${formData.name} has been created successfully.`,
    });
  };

  const handleEditSkill = () => {
    if (!selectedSkill) return;

    setSkills(
      skills.map((skill) =>
        skill.id === selectedSkill.id
          ? {
              ...skill,
              name: formData.name,
              description: formData.description,
              category: formData.category,
            }
          : skill
      )
    );
    setEditDialogOpen(false);
    setSelectedSkill(null);
    resetForm();
    toast({
      title: 'Skill updated',
      description: 'Skill information has been saved successfully.',
    });
  };

  const handleDeleteSkill = () => {
    if (!selectedSkill) return;

    setSkills(skills.filter((skill) => skill.id !== selectedSkill.id));
    setDeleteDialogOpen(false);
    setSelectedSkill(null);
    toast({
      title: 'Skill deleted',
      description: 'Skill has been removed successfully.',
    });
  };

  const openEditDialog = (skill: Skill) => {
    setSelectedSkill(skill);
    setFormData({
      name: skill.name,
      description: skill.description,
      category: skill.category,
    });
    setEditDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Language':
        return 'default';
      case 'Expertise':
        return 'secondary';
      case 'Technical':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getProficiencyLabel = (level: number) => {
    if (level >= 8) return 'Expert';
    if (level >= 6) return 'Advanced';
    if (level >= 4) return 'Intermediate';
    return 'Beginner';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills Management</h1>
          <p className="text-muted-foreground">
            Define skills and manage agent proficiency levels
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Skill
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Skills Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Skills ({filteredSkills.length})</CardTitle>
          <CardDescription>
            View and manage all skills in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Agents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSkills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Star className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{skill.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getCategoryColor(skill.category) as any}>
                      {skill.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md">
                    {skill.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSkill(skill);
                        setAssignDialogOpen(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {skill.agentCount}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(skill)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedSkill(skill);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          View Agents
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedSkill(skill);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Skill Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Skill</DialogTitle>
            <DialogDescription>
              Add a new skill that can be assigned to agents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Skill Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Spanish"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the skill"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSkill}
              disabled={!formData.name || !formData.category}
            >
              Create Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Skill Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>
              Update skill information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Skill Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedSkill(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSkill}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Assignments Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Agents with {selectedSkill?.name} Skill
            </DialogTitle>
            <DialogDescription>
              View and manage agent proficiency levels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead className="text-right">Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_AGENT_SKILLS.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {agent.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {agent.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[agent.proficiency]}
                          min={1}
                          max={10}
                          step={1}
                          className="w-32"
                          disabled
                        />
                        <span className="text-sm text-muted-foreground w-8">
                          {agent.proficiency}/10
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {getProficiencyLabel(agent.proficiency)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedSkill(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this skill? This will remove it
              from all agents.
            </DialogDescription>
          </DialogHeader>
          {selectedSkill && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="font-medium">{selectedSkill.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedSkill.agentCount} agents will lose this skill
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setSelectedSkill(null);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteSkill}>
                  Delete Skill
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
