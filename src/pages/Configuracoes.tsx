import { useState } from "react";
import { Settings, Plus, Pencil, Trash2, CreditCard, Users, Landmark, Moon, Sun, DollarSign, CalendarIcon, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { usePeople } from "@/hooks/usePeople";
import { useProfile } from "@/hooks/useProfile";
import { useSalaries } from "@/hooks/useSalaries";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/AvatarUpload";
import { CategoryBadge } from "@/components/CategoryBadge";
import { formatCurrency } from "@/data/financialData";

const ICON_OPTIONS = [
  "tag", "utensils", "home", "car", "heart-pulse", "graduation-cap", "gamepad-2",
  "wifi", "repeat", "shield", "credit-card", "trending-up", "receipt", "shirt",
  "wrench", "paw-print", "gift", "dollar-sign", "laptop", "wallet",
  "shopping-cart", "music", "plane", "coffee", "book", "briefcase", "baby",
  "dumbbell", "film", "bus", "fuel", "pizza", "beer", "scissors",
];

const COLOR_OPTIONS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#e11d48", "#dc2626", "#78716c", "#64748b",
];

const Configuracoes = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { accounts, add: addAccount, update: updateAccount, remove: removeAccount } = useAccounts();
  const { cards, addCard, updateCard, removeCard } = useCreditCards();
  const { people, addPerson, updatePerson, removePerson } = usePeople();
  const { profile, updateProfile } = useProfile();
  const { salaries, upsert: upsertSalary, remove: removeSalary } = useSalaries();
  const { categories: userCategories, addCategory, updateCategory, removeCategory } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"account" | "card" | "person">("account");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const [salaryDialog, setSalaryDialog] = useState(false);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [salaryValue, setSalaryValue] = useState(0);
  const [salaryValidUntil, setSalaryValidUntil] = useState("");
  const [salaryAccount, setSalaryAccount] = useState<string | null>(null);
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("tag");
  const [categoryColor, setCategoryColor] = useState("#6366f1");

  const openNew = (type: typeof dialogType) => { setDialogType(type); setEditingId(null); setName(""); setDialogOpen(true); };
  const openEdit = (type: typeof dialogType, id: string, currentName: string) => { setDialogType(type); setEditingId(id); setName(currentName); setDialogOpen(true); };

  const save = async () => {
    if (!name.trim()) return;
    if (dialogType === "account") {
      if (editingId) await updateAccount(editingId, name.trim(), accounts.find(a => a.id === editingId)?.balance ?? 0);
      else await addAccount(name.trim(), 0);
    } else if (dialogType === "card") {
      if (editingId) {
        const card = cards.find(c => c.id === editingId);
        if (card) await updateCard(editingId, { name: name.trim(), card_limit: card.card_limit, closing_day: card.closing_day, due_day: card.due_day, image_url: card.image_url });
      } else {
        await addCard({ name: name.trim(), card_limit: 0, closing_day: 1, due_day: 10, image_url: null });
      }
    } else if (dialogType === "person") {
      if (editingId) await updatePerson(editingId, name.trim());
      else await addPerson(name.trim());
    }
    setDialogOpen(false);
  };

  const handleDelete = async (type: typeof dialogType, id: string) => {
    if (type === "account") await removeAccount(id);
    else if (type === "card") await removeCard(id);
    else if (type === "person") await removePerson(id);
  };

  const openNewSalary = () => {
    setEditingSalaryId(null);
    setSalaryYear(new Date().getFullYear());
    setSalaryValue(0);
    setSalaryValidUntil("");
    setSalaryAccount(null);
    setSalaryDialog(true);
  };

  const openEditSalary = (s: { id: string; year: number; amount: number; valid_until: string | null; account: string | null }) => {
    setEditingSalaryId(s.id);
    setSalaryYear(s.year);
    setSalaryValue(s.amount);
    setSalaryValidUntil(s.valid_until ?? "");
    setSalaryAccount(s.account ?? null);
    setSalaryDialog(true);
  };

  const saveSalary = async () => {
    await upsertSalary(salaryYear, salaryValue, salaryValidUntil || null, salaryAccount);
    setSalaryDialog(false);
  };

  const renderSection = (
    items: { id: string; name: string }[],
    type: "account" | "card" | "person",
    label: string,
    placeholder: string,
    icon: React.ReactNode,
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{icon}<h3 className="font-semibold text-lg">{label}</h3></div>
        <Button onClick={() => openNew(type)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Novo</Button>
      </div>
      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center"><Settings className="w-10 h-10 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">Nenhum item cadastrado</p></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(type, item.id, item.name)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(type, item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  const typeLabel = { account: "Conta", card: "Cartão", person: "Pessoa" };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Configurações</h1><p className="text-muted-foreground text-sm">Personalize seu sistema financeiro</p></div>

      {user && (
        <div className="glass-card rounded-xl p-4">
          <p className="font-medium text-sm mb-3">Foto de Perfil</p>
          <AvatarUpload
            avatarUrl={profile?.avatar_url ?? null}
            displayName={profile?.display_name ?? null}
            userId={user.id}
            onUploaded={(url) => updateProfile({ avatar_url: url ?? "" })}
          />
        </div>
      )}

      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
          <div><p className="font-medium text-sm">Modo Escuro</p><p className="text-xs text-muted-foreground">Alternar entre tema claro e escuro</p></div>
        </div>
        <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
      </div>

      {/* Salários por Ano */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Salário Mensal por Ano</h3>
          </div>
          <Button onClick={openNewSalary} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Novo</Button>
        </div>
        {salaries.length === 0 ? (
          <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum salário cadastrado</p>
          </div>
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Válido até</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.year}</TableCell>
                    <TableCell>{formatCurrency(s.amount)}</TableCell>
                    <TableCell>{s.account ?? "—"}</TableCell>
                    <TableCell>{s.valid_until ?? "Indeterminado"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSalary(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSalary(s.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="flex-wrap">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="cards">Cartões</TabsTrigger>
          <TabsTrigger value="people">Pessoas</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Tag className="w-5 h-5 text-primary" /><h3 className="font-semibold text-lg">Categorias</h3></div>
              <Button onClick={() => { setEditingCategoryId(null); setCategoryName(""); setCategoryIcon("tag"); setCategoryColor("#6366f1"); setCategoryDialogOpen(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nova</Button>
            </div>
            {userCategories.length === 0 ? (
              <div className="glass-card rounded-xl p-8 flex flex-col items-center text-center"><Tag className="w-10 h-10 text-muted-foreground/40 mb-2" /><p className="text-sm text-muted-foreground">Nenhuma categoria personalizada cadastrada</p></div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Categoria</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
                  <TableBody>
                    {userCategories.map(cat => (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <CategoryBadge name={cat.name} icon={cat.icon} color={cat.color} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategoryId(cat.id); setCategoryName(cat.name); setCategoryIcon(cat.icon); setCategoryColor(cat.color); setCategoryDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCategory(cat.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="accounts" className="mt-4">
          {renderSection(accounts, "account", "Contas", "Ex: Nubank", <Landmark className="w-5 h-5 text-primary" />)}
        </TabsContent>
        <TabsContent value="cards" className="mt-4">
          {renderSection(cards.map(c => ({ id: c.id, name: c.name })), "card", "Cartões", "Ex: Cartão Nubank", <CreditCard className="w-5 h-5 text-primary" />)}
        </TabsContent>
        <TabsContent value="people" className="mt-4">
          {renderSection(people.map(p => ({ id: p.id, name: p.name })), "person", "Pessoas", "Ex: João", <Users className="w-5 h-5 text-primary" />)}
        </TabsContent>
      </Tabs>

      {/* Dialog genérico */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo(a)"} {typeLabel[dialogType]}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} maxLength={50} placeholder="Nome" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim()}>{editingId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Salário */}
      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingSalaryId ? "Editar" : "Novo"} Salário Anual</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input type="number" min={2020} max={2099} value={salaryYear} onChange={e => setSalaryYear(parseInt(e.target.value) || new Date().getFullYear())} />
            </div>
            <div className="space-y-2">
              <Label>Valor Mensal (R$)</Label>
              <Input type="number" step={0.01} min={0} value={salaryValue || ""} onChange={e => setSalaryValue(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Conta (opcional)</Label>
              <Select value={salaryAccount || "none"} onValueChange={(v) => setSalaryAccount(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Conta onde o salário é depositado</p>
            </div>
            <div className="space-y-2">
              <Label>Válido até (opcional)</Label>
              <Input type="date" value={salaryValidUntil} onChange={e => setSalaryValidUntil(e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe vazio para vigência indeterminada</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryDialog(false)}>Cancelar</Button>
            <Button onClick={saveSalary} disabled={!salaryValue || !salaryYear}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Categoria */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingCategoryId ? "Editar" : "Nova"} Categoria</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={categoryName} onChange={e => setCategoryName(e.target.value)} maxLength={50} placeholder="Ex: Alimentação" />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: categoryColor === c ? "hsl(var(--foreground))" : "transparent",
                      transform: categoryColor === c ? "scale(1.2)" : "scale(1)",
                    }}
                    onClick={() => setCategoryColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                {ICON_OPTIONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all"
                    style={{
                      borderColor: categoryIcon === ic ? categoryColor : "transparent",
                      backgroundColor: categoryIcon === ic ? categoryColor + "1a" : "transparent",
                    }}
                    onClick={() => setCategoryIcon(ic)}
                  >
                    <CategoryBadge name="" icon={ic} color={categoryIcon === ic ? categoryColor : "hsl(var(--muted-foreground))"} showLabel={false} />
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="glass-card rounded-lg p-3">
                <CategoryBadge name={categoryName || "Categoria"} icon={categoryIcon} color={categoryColor} size="md" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!categoryName.trim()) return;
              if (editingCategoryId) await updateCategory(editingCategoryId, { name: categoryName.trim(), icon: categoryIcon, color: categoryColor });
              else await addCategory(categoryName.trim(), categoryIcon, categoryColor);
              setCategoryDialogOpen(false);
            }} disabled={!categoryName.trim()}>{editingCategoryId ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Configuracoes;
