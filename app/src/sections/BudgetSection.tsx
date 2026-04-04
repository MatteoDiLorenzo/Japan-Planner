import { useState } from 'react';
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, AlertCircle, Plane, Utensils, Ticket, ShoppingBag, Hotel, MoreHorizontal, Euro, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrip } from '@/hooks/useTrip';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BudgetItem } from '@/types';
import { eurToJpy, formatEurFromJpy, formatJpy, JPY_PER_EUR } from '@/lib/currency';

const categories = [
  { id: 'transport', label: 'Trasporti', icon: Plane, color: '#3B82F6' },
  { id: 'food', label: 'Cibo', icon: Utensils, color: '#F59E0B' },
  { id: 'attraction', label: 'Attrazioni', icon: Ticket, color: '#8B5CF6' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#EC4899' },
  { id: 'accommodation', label: 'Alloggio', icon: Hotel, color: '#10B981' },
  { id: 'other', label: 'Altro', icon: MoreHorizontal, color: '#6B7280' },
];

export function BudgetSection() {
  const isMobile = useIsMobile();
  const { budgetItems, totalBudget, addBudgetItem, removeBudgetItem, getTotalSpent, getRemainingBudget } = useTrip();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    category: 'other',
    description: '',
    amount: '',
  });
  /** true = importo inserito in euro; false = in yen (per chi preferisce) */
  const [inputInEur, setInputInEur] = useState(true);
  /** true = mostra importi principali in euro */
  const [displayEur, setDisplayEur] = useState(true);

  const totalSpent = getTotalSpent();
  const remaining = getRemainingBudget();
  const budgetPercent = Math.min((totalSpent / totalBudget) * 100, 100);

  const handleAddItem = () => {
    if (!newItem.description || !newItem.amount) return;

    const raw = parseFloat(newItem.amount.replace(',', '.'));
    if (Number.isNaN(raw) || raw < 0) return;

    const amountJpy = inputInEur ? eurToJpy(raw) : Math.round(raw);

    addBudgetItem({
      category: newItem.category as BudgetItem['category'],
      description: newItem.description,
      amount: amountJpy,
    });

    setNewItem({ category: 'other', description: '', amount: '' });
    setShowAddDialog(false);
  };

  const getCategoryIcon = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.icon || MoreHorizontal;
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || '#6B7280';
  };

  const getCategoryLabel = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.label || categoryId;
  };

  const expensesByCategory = budgetItems.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const formatCurrency = (amountJpy: number) => {
    if (displayEur) {
      return formatEurFromJpy(amountJpy, 2);
    }
    return formatJpy(amountJpy);
  };

  const formatSecondary = (amountJpy: number) => {
    if (displayEur) {
      return formatJpy(amountJpy);
    }
    return formatEurFromJpy(amountJpy, 2);
  };

  return (
    <section className="min-h-screen bg-black pt-16 md:pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Budget</h2>
              <p className="text-white/60 text-sm md:text-base">
                Valuta principale: euro (1 € = {JPY_PER_EUR} ¥)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setDisplayEur(!displayEur)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/10 rounded-lg text-white/70 hover:bg-white/20 transition-colors text-sm"
            >
              {displayEur ? <Euro className="w-4 h-4" /> : <CircleDollarSign className="w-4 h-4" />}
              <span>{displayEur ? 'EUR' : 'JPY'}</span>
            </button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-sm h-10">
                  <Plus className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Aggiungi Spesa</span>
                  <span className="sm:hidden">Aggiungi</span>
                </Button>
              </DialogTrigger>
              <DialogContent className={`bg-gray-900 border-white/10 ${isMobile ? 'max-w-[95vw] w-full' : ''}`}>
                <DialogHeader>
                  <DialogTitle className="text-white">Aggiungi spesa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Categoria</label>
                    <Select
                      value={newItem.category}
                      onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/20">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="text-white">
                            <div className="flex items-center gap-2">
                              <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Descrizione</label>
                    <Input
                      placeholder="Es. Cena a Shibuya"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setInputInEur(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${inputInEur ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70'}`}
                    >
                      Importo in €
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputInEur(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${!inputInEur ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/70'}`}
                    >
                      Importo in ¥
                    </button>
                  </div>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">
                      {inputInEur ? 'Importo (€)' : 'Importo (¥)'}
                    </label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder={inputInEur ? '50' : '5000'}
                      value={newItem.amount}
                      onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  <Button onClick={handleAddItem} className="w-full bg-emerald-500 hover:bg-emerald-600">
                    Aggiungi
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="bg-white/5 border-white/10 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <span className="text-white/50 text-xs md:text-sm">Budget Totale</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(totalBudget)}</p>
            <p className="text-white/50 text-xs md:text-sm mt-1">{formatSecondary(totalBudget)}</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
              </div>
              <span className="text-white/50 text-xs md:text-sm">Speso</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-red-400">{formatCurrency(totalSpent)}</p>
            <p className="text-white/50 text-xs md:text-sm mt-1">{budgetPercent.toFixed(1)}% del budget</p>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
              </div>
              <span className="text-white/50 text-xs md:text-sm">Rimanente</span>
            </div>
            <p className={`text-2xl md:text-3xl font-bold ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatCurrency(remaining)}
            </p>
            <p className="text-white/50 text-xs md:text-sm mt-1">{formatSecondary(remaining)}</p>
            {remaining < 0 && (
              <p className="text-red-400 text-xs md:text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Budget superato!
              </p>
            )}
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-white/70 text-xs md:text-sm">Utilizzo Budget</span>
            <span className={`text-xs md:text-sm font-medium ${budgetPercent > 90 ? 'text-red-400' : 'text-white'}`}>
              {budgetPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 md:h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetPercent > 90 ? 'bg-red-500' : budgetPercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10">
              <div className="p-3 md:p-4 border-b border-white/10">
                <h3 className="font-semibold text-white text-sm md:text-base">Spese</h3>
              </div>
              <div className="divide-y divide-white/10">
                {budgetItems.length === 0 ? (
                  <div className="p-6 md:p-8 text-center">
                    <p className="text-white/50 text-sm md:text-base">Nessuna spesa registrata</p>
                    <p className="text-white/30 text-xs md:text-sm mt-1">Aggiungi la tua prima spesa</p>
                  </div>
                ) : (
                  budgetItems.map((item) => {
                    const Icon = getCategoryIcon(item.category);
                    const color = getCategoryColor(item.category);

                    return (
                      <div key={item.id} className="p-3 md:p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                          <div
                            className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium text-sm truncate">{item.description}</p>
                            <p className="text-white/50 text-xs md:text-sm">{getCategoryLabel(item.category)}</p>
                            <p className="text-white/35 text-xs">{formatSecondary(item.amount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                          <span className="text-white font-semibold text-sm md:text-base">{formatCurrency(item.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/50 hover:text-red-400 w-8 h-8"
                            onClick={() => removeBudgetItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-white/10 p-3 md:p-4">
              <h3 className="font-semibold text-white mb-3 md:mb-4 text-sm md:text-base">Ripartizione</h3>
              <div className="space-y-3 md:space-y-4">
                {categories.map((cat) => {
                  const amount = expensesByCategory[cat.id] || 0;
                  const percent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;

                  if (amount === 0) return null;

                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-3 h-3 md:w-4 md:h-4" style={{ color: cat.color }} />
                          <span className="text-white/70 text-xs md:text-sm">{cat.label}</span>
                        </div>
                        <span className="text-white text-xs md:text-sm">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${percent}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}

                {Object.keys(expensesByCategory).length === 0 && (
                  <p className="text-white/50 text-center py-4 text-sm">Nessuna spesa</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
