import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'pt';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  // Navigation
  dashboard: { en: 'Dashboard', pt: 'Painel' },
  clients: { en: 'Clients', pt: 'Clientes' },
  jobs: { en: 'Jobs', pt: 'Agenda' },
  team: { en: 'Team', pt: 'Equipe' },
  quotations: { en: 'Quotations', pt: 'Orçamentos' },
  finances: { en: 'Finances', pt: 'Financeiro' },
  receipts: { en: 'Receipts', pt: 'Recibos' },
  logout: { en: 'Logout', pt: 'Sair' },
  
  // Dashboard
  welcome: { en: 'Welcome back', pt: 'Bem-vindo de volta' },
  total_revenue: { en: 'Total Revenue', pt: 'Faturamento Total' },
  staff_payouts: { en: 'Staff Payouts', pt: 'Pagamentos Equipe' },
  net_profit: { en: 'Net Profit', pt: 'Lucro Líquido' },
  active_clients: { en: 'Active Clients', pt: 'Clientes Ativos' },
  recent_jobs: { en: 'Recent Jobs', pt: 'Serviços Recentes' },
  view_all: { en: 'View All', pt: 'Ver Tudo' },
  
  // Clients
  client_database: { en: 'Client Database', pt: 'Base de Clientes' },
  manage_clients: { en: 'Manage your residential and Airbnb clients.', pt: 'Gerencie seus clientes residenciais e Airbnb.' },
  add_new_client: { en: 'Add New Client', pt: 'Novo Cliente' },
  search_clients: { en: 'Search clients...', pt: 'Buscar clientes...' },
  all: { en: 'All', pt: 'Todos' },
  regular: { en: 'Regular', pt: 'Regular' },
  airbnb: { en: 'Airbnb', pt: 'Airbnb' },
  
  // Jobs
  cleaning_schedule: { en: 'Cleaning Schedule', pt: 'Agenda de Limpeza' },
  manage_tasks: { en: 'Manage daily tasks and track team progress.', pt: 'Gerencie tarefas diárias e acompanhe o progresso.' },
  new_job: { en: 'New Job', pt: 'Novo Serviço' },
  scheduled: { en: 'Scheduled', pt: 'Agendado' },
  on_the_way: { en: 'On the way', pt: 'A caminho' },
  started: { en: 'Started', pt: 'Iniciado' },
  finished: { en: 'Finished', pt: 'Finalizado' },
  cancelled: { en: 'Cancelled', pt: 'Cancelado' },
  today: { en: 'Today', pt: 'Hoje' },
  unassigned: { en: 'Unassigned', pt: 'Não atribuído' },
  
  // Financial
  financial_reports: { en: 'Financial Reports', pt: 'Relatórios Financeiros' },
  analyze_performance: { en: 'Analyze your business performance and growth.', pt: 'Analise o desempenho e crescimento do seu negócio.' },
  week: { en: 'Week', pt: 'Semana' },
  month: { en: 'Month', pt: 'Mês' },
  custom: { en: 'Custom', pt: 'Personalizado' },
  revenue_vs_expenses: { en: 'Revenue vs Expenses', pt: 'Receita vs Despesas' },
  profit_trend: { en: 'Profit Trend', pt: 'Tendência de Lucro' },
  
  // Common
  save: { en: 'Save', pt: 'Salvar' },
  cancel: { en: 'Cancel', pt: 'Cancelar' },
  loading: { en: 'Loading...', pt: 'Carregando...' },
  no_data: { en: 'No data found.', pt: 'Nenhum dado encontrado.' },
  actions: { en: 'Actions', pt: 'Ações' },
  status: { en: 'Status', pt: 'Status' },
  date: { en: 'Date', pt: 'Data' },
  time: { en: 'Time', pt: 'Hora' },
  address: { en: 'Address', pt: 'Endereço' },
  phone: { en: 'Phone', pt: 'Telefone' },
  email: { en: 'Email', pt: 'E-mail' },
  name: { en: 'Name', pt: 'Nome' },
  notes: { en: 'Notes', pt: 'Notas' },
  service_type: { en: 'Service Type', pt: 'Tipo de Serviço' },
  service_value: { en: 'Service Value', pt: 'Valor do Serviço' },
  staff_pay: { en: 'Staff Pay', pt: 'Pagamento Equipe' },
  assigned_staff: { en: 'Assigned Staff', pt: 'Equipe Atribuída' },
  
  // Quotations
  quotation_calculator: { en: 'Quotation Calculator', pt: 'Calculadora de Orçamento' },
  generate_estimates: { en: 'Generate accurate estimates for your clients instantly.', pt: 'Gere estimativas precisas para seus clientes instantaneamente.' },
  hourly: { en: 'Hourly', pt: 'Por Hora' },
  detailed: { en: 'Detailed', pt: 'Detalhado' },
  estimate_summary: { en: 'Estimate Summary', pt: 'Resumo da Estimativa' },
  total_estimated: { en: 'Total Estimated', pt: 'Total Estimado' },
  generate_pdf: { en: 'Generate PDF Quote', pt: 'Gerar Orçamento PDF' },
  
  // Reports
  receipts_invoicing: { en: 'Receipts & Invoicing', pt: 'Recibos e Faturamento' },
  generate_pdfs: { en: 'Generate professional PDFs for your clients.', pt: 'Gere PDFs profissionais para seus clientes.' },
  download_pdf: { en: 'Download PDF Receipt', pt: 'Baixar Recibo PDF' },
  receipt_preview: { en: 'Receipt Preview', pt: 'Prévia do Recibo' },
  bill_to: { en: 'BILL TO', pt: 'COBRAR DE' },
  summary: { en: 'SUMMARY', pt: 'RESUMO' },
  total_paid: { en: 'Total Paid', pt: 'Total Pago' },
  thank_you: { en: 'Thank you for choosing Maid By Ana!', pt: 'Obrigado por escolher a Maid By Ana!' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
