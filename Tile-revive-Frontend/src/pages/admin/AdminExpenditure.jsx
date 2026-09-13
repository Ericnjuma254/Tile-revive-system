import React, { useEffect, useMemo, useState } from "react";
import {
    getExpenses,
    getExpenseSummary,
    createExpense,
    updateExpense,
    deleteExpense as deleteExpenseApi,
} from "../../services/api";



const CATEGORIES = [
    "RESTOCKING",
    "DELIVERY",
    "PACKAGING",
    "PRODUCTION",
    "MARKETING",
    "LABOUR",
    "UTILITIES",
    "OTHER",
];

const PAYMENT_METHODS = [
    "CASH",
    "MPESA",
    "BANK",
    "CARD",
    "OTHER",
];

const STATUSES = [
    "PAID",
    "PENDING",
    "CANCELLED",
];
const EMPTY_FORM = {
    title: "",
    category: "RESTOCKING",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "CASH",
    payee: "",
    reference: "",
    status: "PAID",
    notes: "",
};
function money(value) {
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function titleCase(value = "") {
    return value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function categoryClass(category) {
    return `category-${String(category || "OTHER").toLowerCase()}`;
}

function statusClass(status) {
    return `status-${String(status || "PENDING").toLowerCase()}`;
}

export default function AdminExpenditure() {
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        today: 0,
        thisMonth: 0,
        thisYear: 0,
        stockCost: 0,
        marketingCost: 0,
        operatingCost: 0,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [status, setStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [selectedExpense, setSelectedExpense] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    async function loadExpenses() {
        try {
            setLoading(true);
            setError("");

            const params = {
                page: 1,
                limit: 100,
                search,
                category,
                paymentMethod,
                status,
                startDate,
                endDate,
            };

            const data = await getExpenses(params);

            if (!data?.success) {
                throw new Error(
                    data?.message || "Failed to load expenses."
                );
            }

            setExpenses(
                Array.isArray(data.expenses)
                    ? data.expenses
                    : []
            );

            if (data.summary) {
                setSummary((previous) => ({
                    ...previous,
                    ...data.summary,
                }));
            }
        } catch (err) {
            setError(
                err.message || "Unable to load expenses."
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadSummary() {
        try {
            const data = await getExpenseSummary();

            if (data?.success && data.summary) {
                setSummary((previous) => ({
                    ...previous,
                    ...data.summary,
                }));
            }
        } catch (err) {
            setError(
                err.message || "Unable to load expense summary."
            );
        }
    }

    useEffect(() => {
        loadExpenses();
        loadSummary();
    }, []);

    const filteredExpenses = useMemo(() => {
        return expenses;
    }, [expenses]);

    const categoryTotals = useMemo(() => {
        const totals = {};

        CATEGORIES.forEach((item) => {
            totals[item] = 0;
        });

        filteredExpenses.forEach((expense) => {
            if (expense.status !== "PAID") return;

            const key = expense.category || "OTHER";
            totals[key] = (totals[key] || 0) + Number(expense.amount || 0);
        });

        return Object.entries(totals)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);
    }, [filteredExpenses]);

    const largestCategory = categoryTotals[0];

    function openCreate() {
        setEditingExpense(null);
        setForm({
            ...EMPTY_FORM,
            expenseDate: new Date().toISOString().slice(0, 10),
        });
        setShowModal(true);
    }

    function openEdit(expense) {
        setEditingExpense(expense);

        setForm({
            title: expense.title || "",
            category: expense.category || "OTHER",
            amount: expense.amount ?? "",
            expenseDate: expense.expenseDate
                ? new Date(expense.expenseDate).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            description: expense.description || "",
            paymentMethod: expense.paymentMethod || "CASH",
            payee: expense.payee || "",
            reference: expense.reference || "",
            status: expense.status || "PAID",
            notes: expense.notes || "",
        });

        setShowModal(true);
    }

    function updateForm(field, value) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    async function saveExpense(event) {
        event.preventDefault();

        if (!form.title.trim()) {
            setError("Expense title is required.");
            return;
        }

        if (!form.amount || Number(form.amount) <= 0) {
            setError("Enter a valid expense amount.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const payload = {
                ...form,
                amount: Number(form.amount),
            };

            const data = editingExpense
                ? await updateExpense(
                      editingExpense.id,
                      payload
                  )
                : await createExpense(payload);

            if (!data?.success) {
                throw new Error(
                    data?.message || "Unable to save expense."
                );
            }

            setShowModal(false);
            setEditingExpense(null);
            setForm(EMPTY_FORM);

            await loadExpenses();
            await loadSummary();
        } catch (err) {
            setError(err.message || "Unable to save expense.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteExpense(expense) {
        const confirmed = window.confirm(
            `Delete "${expense.title || "this expense"}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            setDeletingId(expense.id);
            setError("");

            const data = await deleteExpenseApi(expense.id);

            if (!data?.success) {
                throw new Error(
                    data?.message || "Unable to delete expense."
                );
            }

            setSelectedExpense(null);

            await loadExpenses();
            await loadSummary();
        } catch (err) {
            setError(err.message || "Unable to delete expense.");
        } finally {
            setDeletingId(null);
        }
    }

    function clearFilters() {
        setSearch("");
        setCategory("");
        setPaymentMethod("");
        setStatus("");
        setStartDate("");
        setEndDate("");
    }

    const maxCategoryAmount = Math.max(
        ...categoryTotals.map((item) => item.amount),
        1
    );

    return (
        <div className="admin-expenditure-page">
            <style>{`
                .admin-expenditure-page {
                    min-height: 100vh;
                    background:
                        radial-gradient(circle at 90% 0%, rgba(255,255,255,.06), transparent 30%),
                        #050505;
                    color: #f5f5f5;
                    padding: 32px;
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                .expenditure-shell {
                    max-width: 1500px;
                    margin: 0 auto;
                }

                .expense-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 24px;
                    margin-bottom: 28px;
                }

                .expense-eyebrow {
                    color: #8f8f8f;
                    text-transform: uppercase;
                    letter-spacing: .16em;
                    font-size: 11px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }

                .expense-header h1 {
                    margin: 0;
                    font-size: clamp(30px, 4vw, 48px);
                    letter-spacing: -.04em;
                    line-height: 1;
                }

                .expense-header p {
                    color: #8d8d8d;
                    margin: 12px 0 0;
                    max-width: 650px;
                }

                .primary-expense-btn {
                    border: 1px solid #fff;
                    background: #fff;
                    color: #050505;
                    border-radius: 12px;
                    padding: 13px 18px;
                    font-weight: 800;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: .2s ease;
                }

                .primary-expense-btn:hover {
                    transform: translateY(-2px);
                    background: #e8e8e8;
                }

                .expense-error {
                    border: 1px solid rgba(255,80,80,.35);
                    background: rgba(255,50,50,.08);
                    color: #ff9b9b;
                    padding: 13px 16px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }

                .expense-kpis {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 14px;
                    margin-bottom: 18px;
                }

                .expense-kpi {
                    border: 1px solid #202020;
                    background: linear-gradient(145deg, #111, #090909);
                    border-radius: 18px;
                    padding: 20px;
                    min-height: 125px;
                }

                .expense-kpi-label {
                    color: #8c8c8c;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                    font-weight: 700;
                }

                .expense-kpi-value {
                    margin-top: 12px;
                    font-size: 27px;
                    font-weight: 850;
                    letter-spacing: -.03em;
                }

                .expense-kpi-sub {
                    margin-top: 8px;
                    color: #676767;
                    font-size: 12px;
                }

                .expense-secondary-grid {
                    display: grid;
                    grid-template-columns: 1.4fr 1fr;
                    gap: 18px;
                    margin-bottom: 20px;
                }

                .expense-panel {
                    border: 1px solid #202020;
                    background: #0b0b0b;
                    border-radius: 18px;
                    overflow: hidden;
                }

                .expense-panel-head {
                    padding: 19px 20px;
                    border-bottom: 1px solid #1c1c1c;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                }

                .expense-panel-head h2 {
                    font-size: 15px;
                    margin: 0;
                }

                .expense-panel-head span {
                    color: #777;
                    font-size: 12px;
                }

                .category-list {
                    padding: 16px 20px 20px;
                }

                .category-row {
                    margin-bottom: 15px;
                }

                .category-row:last-child {
                    margin-bottom: 0;
                }

                .category-meta {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 7px;
                    font-size: 12px;
                }

                .category-meta span:first-child {
                    color: #c8c8c8;
                }

                .category-meta span:last-child {
                    color: #8d8d8d;
                }

                .category-track {
                    height: 7px;
                    background: #181818;
                    border-radius: 99px;
                    overflow: hidden;
                }

                .category-fill {
                    height: 100%;
                    background: #f4f4f4;
                    border-radius: inherit;
                    transition: width .35s ease;
                }

                .spending-highlight {
                    padding: 24px;
                }

                .spending-highlight-label {
                    color: #777;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: .08em;
                }

                .spending-highlight-value {
                    font-size: 34px;
                    font-weight: 850;
                    margin: 8px 0 5px;
                }

                .spending-highlight-note {
                    color: #747474;
                    font-size: 13px;
                }

                .expense-filters {
                    padding: 16px;
                    display: grid;
                    grid-template-columns: 2fr repeat(5, 1fr);
                    gap: 10px;
                    border-bottom: 1px solid #1c1c1c;
                }

                .expense-input,
                .expense-select {
                    width: 100%;
                    box-sizing: border-box;
                    background: #111;
                    border: 1px solid #242424;
                    color: #f4f4f4;
                    border-radius: 10px;
                    padding: 11px 12px;
                    outline: none;
                    font-size: 13px;
                }

                .expense-input:focus,
                .expense-select:focus {
                    border-color: #666;
                }

                .filter-clear {
                    background: transparent;
                    border: 1px solid #292929;
                    color: #999;
                    border-radius: 10px;
                    padding: 10px;
                    cursor: pointer;
                }

                .expense-table-wrap {
                    overflow-x: auto;
                }

                .expense-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 950px;
                }

                .expense-table th {
                    color: #686868;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: .09em;
                    text-align: left;
                    padding: 14px 18px;
                    border-bottom: 1px solid #1c1c1c;
                    white-space: nowrap;
                }

                .expense-table td {
                    padding: 15px 18px;
                    border-bottom: 1px solid #151515;
                    font-size: 13px;
                    color: #d0d0d0;
                }

                .expense-table tbody tr {
                    transition: background .15s ease;
                    cursor: pointer;
                }

                .expense-table tbody tr:hover {
                    background: #111;
                }

                .expense-title {
                    color: #fff;
                    font-weight: 750;
                }

                .expense-muted {
                    color: #666;
                    font-size: 11px;
                    margin-top: 4px;
                }

                .expense-amount {
                    font-weight: 800;
                    color: #fff;
                    white-space: nowrap;
                }

                .expense-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 8px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .04em;
                    white-space: nowrap;
                }

                .category-restocking,
                .category-production {
                    background: rgba(255,255,255,.09);
                    color: #eee;
                }

                .category-marketing {
                    background: rgba(180,150,255,.12);
                    color: #d6c7ff;
                }

                .category-delivery {
                    background: rgba(90,180,255,.12);
                    color: #a7d9ff;
                }

                .category-packaging {
                    background: rgba(255,200,80,.11);
                    color: #ffe39b;
                }

                .category-labour {
                    background: rgba(90,220,160,.11);
                    color: #a9f0cc;
                }

                .category-utilities,
                .category-other {
                    background: rgba(255,255,255,.06);
                    color: #aaa;
                }

                .status-paid {
                    background: rgba(70,220,140,.1);
                    color: #8ee7b3;
                }

                .status-pending {
                    background: rgba(255,190,70,.11);
                    color: #ffd88c;
                }

                .status-cancelled {
                    background: rgba(255,70,70,.1);
                    color: #ff9c9c;
                }

                .expense-actions {
                    display: flex;
                    gap: 7px;
                }

                .icon-btn {
                    width: 32px;
                    height: 32px;
                    border: 1px solid #262626;
                    background: #101010;
                    color: #aaa;
                    border-radius: 8px;
                    cursor: pointer;
                }

                .icon-btn:hover {
                    border-color: #555;
                    color: #fff;
                }

                .empty-state,
                .loading-state {
                    padding: 55px 20px;
                    text-align: center;
                    color: #666;
                }

                .expense-footer {
                    padding: 13px 18px;
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    color: #666;
                    font-size: 12px;
                }

                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    background: rgba(0,0,0,.78);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .expense-modal {
                    width: min(760px, 100%);
                    max-height: 90vh;
                    overflow-y: auto;
                    background: #0b0b0b;
                    border: 1px solid #292929;
                    border-radius: 20px;
                    box-shadow: 0 30px 100px rgba(0,0,0,.7);
                }

                .modal-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #1d1d1d;
                }

                .modal-head h2 {
                    margin: 0;
                    font-size: 18px;
                }

                .modal-close {
                    background: transparent;
                    border: 0;
                    color: #777;
                    font-size: 24px;
                    cursor: pointer;
                }

                .expense-form {
                    padding: 20px;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 14px;
                }

                .form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }

                .form-field.full {
                    grid-column: 1 / -1;
                }

                .form-field label {
                    color: #888;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: .07em;
                }

                .form-field textarea {
                    min-height: 90px;
                    resize: vertical;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                    padding-top: 18px;
                    border-top: 1px solid #1d1d1d;
                }

                .secondary-btn,
                .save-btn {
                    border-radius: 10px;
                    padding: 11px 17px;
                    font-weight: 750;
                    cursor: pointer;
                }

                .secondary-btn {
                    background: #111;
                    border: 1px solid #292929;
                    color: #aaa;
                }

                .save-btn {
                    background: #fff;
                    border: 1px solid #fff;
                    color: #050505;
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 14px;
                    padding: 20px;
                }

                .detail-item {
                    border: 1px solid #1c1c1c;
                    border-radius: 12px;
                    padding: 14px;
                    background: #101010;
                }

                .detail-item small {
                    display: block;
                    color: #666;
                    text-transform: uppercase;
                    font-size: 9px;
                    letter-spacing: .08em;
                    margin-bottom: 7px;
                }

                .detail-item strong {
                    color: #eee;
                    font-size: 13px;
                }

                @media (max-width: 1100px) {
                    .expense-kpis {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .expense-filters {
                        grid-template-columns: repeat(3, 1fr);
                    }

                    .expense-secondary-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 700px) {
                    .admin-expenditure-page {
                        padding: 18px 12px;
                    }

                    .expense-header {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .primary-expense-btn {
                        width: 100%;
                    }

                    .expense-kpis {
                        grid-template-columns: 1fr;
                    }

                    .expense-filters {
                        grid-template-columns: 1fr;
                    }

                    .form-grid,
                    .detail-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-field.full {
                        grid-column: auto;
                    }
                }
            `}</style>

            <div className="expenditure-shell">
                <header className="expense-header">
                    <div>
                        <div className="expense-eyebrow">Finance / Expenditure</div>
                        <h1>Business Expenditure</h1>
                        <p>
                            Track every shilling leaving the business — stock,
                            delivery, production, marketing and operating costs.
                        </p>
                    </div>

                    <button
                        className="primary-expense-btn"
                        onClick={openCreate}
                    >
                        + Record Expense
                    </button>
                </header>

                {error && (
                    <div className="expense-error">
                        {error}
                    </div>
                )}

                <section className="expense-kpis">
                    <div className="expense-kpi">
                        <div className="expense-kpi-label">
                            Total expenditure
                        </div>
                        <div className="expense-kpi-value">
                            {money(summary.total)}
                        </div>
                        <div className="expense-kpi-sub">
                            All paid expenses
                        </div>
                    </div>

                    <div className="expense-kpi">
                        <div className="expense-kpi-label">Today</div>
                        <div className="expense-kpi-value">
                            {money(summary.today)}
                        </div>
                        <div className="expense-kpi-sub">
                            Paid today
                        </div>
                    </div>

                    <div className="expense-kpi">
                        <div className="expense-kpi-label">This month</div>
                        <div className="expense-kpi-value">
                            {money(summary.thisMonth)}
                        </div>
                        <div className="expense-kpi-sub">
                            Current month
                        </div>
                    </div>

                    <div className="expense-kpi">
                        <div className="expense-kpi-label">This year</div>
                        <div className="expense-kpi-value">
                            {money(summary.thisYear)}
                        </div>
                        <div className="expense-kpi-sub">
                            Current financial year
                        </div>
                    </div>
                </section>

                <section className="expense-secondary-grid">
                    <div className="expense-panel">
                        <div className="expense-panel-head">
                            <h2>Where the money is going</h2>
                            <span>Paid expenses</span>
                        </div>

                        <div className="category-list">
                            {categoryTotals.map((item) => (
                                <div
                                    className="category-row"
                                    key={item.name}
                                >
                                    <div className="category-meta">
                                        <span>{titleCase(item.name)}</span>
                                        <span>{money(item.amount)}</span>
                                    </div>

                                    <div className="category-track">
                                        <div
                                            className="category-fill"
                                            style={{
                                                width: `${Math.max(
                                                    (item.amount /
                                                        maxCategoryAmount) *
                                                        100,
                                                    item.amount > 0 ? 3 : 0
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="expense-panel">
                        <div className="expense-panel-head">
                            <h2>Cost structure</h2>
                            <span>Current totals</span>
                        </div>

                        <div className="spending-highlight">
                            <div className="spending-highlight-label">
                                Largest category
                            </div>

                            <div className="spending-highlight-value">
                                {largestCategory
                                    ? money(largestCategory.amount)
                                    : money(0)}
                            </div>

                            <div className="spending-highlight-note">
                                {largestCategory
                                    ? titleCase(largestCategory.name)
                                    : "No expenses recorded yet"}
                            </div>

                            <div
                                style={{
                                    height: 1,
                                    background: "#1c1c1c",
                                    margin: "24px 0",
                                }}
                            />

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div className="expense-muted">
                                        Stock
                                    </div>
                                    <strong>
                                        {money(summary.stockCost)}
                                    </strong>
                                </div>

                                <div>
                                    <div className="expense-muted">
                                        Marketing
                                    </div>
                                    <strong>
                                        {money(summary.marketingCost)}
                                    </strong>
                                </div>

                                <div>
                                    <div className="expense-muted">
                                        Operating
                                    </div>
                                    <strong>
                                        {money(summary.operatingCost)}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="expense-panel">
                    <div className="expense-panel-head">
                        <div>
                            <h2>Expense transactions</h2>
                            <span>
                                {filteredExpenses.length} transaction
                                {filteredExpenses.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>

                    <div className="expense-filters">
                        <input
                            className="expense-input"
                            placeholder="Search title, supplier, reference..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    loadExpenses();
                                }
                            }}
                        />

                        <select
                            className="expense-select"
                            value={category}
                            onChange={(event) => {
                                setCategory(event.target.value);
                            }}
                        >
                            <option value="">All categories</option>
                            {CATEGORIES.map((item) => (
                                <option key={item} value={item}>
                                    {titleCase(item)}
                                </option>
                            ))}
                        </select>

                        <select
                            className="expense-select"
                            value={paymentMethod}
                            onChange={(event) =>
                                setPaymentMethod(event.target.value)
                            }
                        >
                            <option value="">All payments</option>
                            {PAYMENT_METHODS.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>

                        <select
                            className="expense-select"
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value)
                            }
                        >
                            <option value="">All statuses</option>
                            {STATUSES.map((item) => (
                                <option key={item} value={item}>
                                    {titleCase(item)}
                                </option>
                            ))}
                        </select>

                        <input
                            className="expense-input"
                            type="date"
                            value={startDate}
                            onChange={(event) =>
                                setStartDate(event.target.value)
                            }
                            title="From date"
                        />

                        <button
                            className="filter-clear"
                            onClick={() => {
                                clearFilters();
                                setTimeout(loadExpenses, 0);
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            padding: "0 16px 14px",
                            borderBottom: "1px solid #1c1c1c",
                        }}
                    >
                        <input
                            className="expense-input"
                            type="date"
                            value={endDate}
                            onChange={(event) =>
                                setEndDate(event.target.value)
                            }
                            title="To date"
                            style={{ maxWidth: 180 }}
                        />

                        <button
                            className="filter-clear"
                            onClick={loadExpenses}
                        >
                            Apply filters
                        </button>
                    </div>

                    <div className="expense-table-wrap">
                        {loading ? (
                            <div className="loading-state">
                                Loading expenditure...
                            </div>
                        ) : filteredExpenses.length === 0 ? (
                            <div className="empty-state">
                                <div
                                    style={{
                                        fontSize: 32,
                                        marginBottom: 10,
                                    }}
                                >
                                    ₭
                                </div>
                                <strong>
                                    No expenditure recorded
                                </strong>
                                <div style={{ marginTop: 6 }}>
                                    Record your first business expense to
                                    start tracking profitability.
                                </div>
                            </div>
                        ) : (
                            <table className="expense-table">
                                <thead>
                                    <tr>
                                        <th>Expense</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Payment</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Payee</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredExpenses.map((expense) => (
                                        <tr
                                            key={expense.id}
                                            onClick={() =>
                                                setSelectedExpense(expense)
                                            }
                                        >
                                            <td>
                                                <div className="expense-title">
                                                    {expense.title ||
                                                        "Business Expense"}
                                                </div>
                                                {expense.reference && (
                                                    <div className="expense-muted">
                                                        Ref:{" "}
                                                        {expense.reference}
                                                    </div>
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`expense-badge ${categoryClass(
                                                        expense.category
                                                    )}`}
                                                >
                                                    {titleCase(
                                                        expense.category
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="expense-amount">
                                                    {money(expense.amount)}
                                                </span>
                                            </td>

                                            <td>
                                                {expense.paymentMethod ||
                                                    "—"}
                                            </td>

                                            <td>
                                                <span
                                                    className={`expense-badge ${statusClass(
                                                        expense.status
                                                    )}`}
                                                >
                                                    {titleCase(
                                                        expense.status
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    expense.expenseDate
                                                )}
                                            </td>

                                            <td>
                                                {expense.payee || "—"}
                                            </td>

                                            <td>
                                                <div
                                                    className="expense-actions"
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    <button
                                                        className="icon-btn"
                                                        title="Edit"
                                                        onClick={() =>
                                                            openEdit(expense)
                                                        }
                                                    >
                                                        ✎
                                                    </button>

                                                    <button
                                                        className="icon-btn"
                                                        title="Delete"
                                                        disabled={
                                                            deletingId ===
                                                            expense.id
                                                        }
                                                        onClick={() =>
                                                            deleteExpense(
                                                                expense
                                                            )
                                                        }
                                                    >
                                                        {deletingId ===
                                                        expense.id
                                                            ? "…"
                                                            : "×"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="expense-footer">
                        <span>
                            Showing {filteredExpenses.length} expense
                            {filteredExpenses.length === 1 ? "" : "s"}
                        </span>
                        <span>
                            Filtered total:{" "}
                            <strong style={{ color: "#ddd" }}>
                                {money(
                                    filteredExpenses.reduce(
                                        (sum, item) =>
                                            sum +
                                            Number(item.amount || 0),
                                        0
                                    )
                                )}
                            </strong>
                        </span>
                    </div>
                </section>
            </div>

            {showModal && (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowModal(false);
                        }
                    }}
                >
                    <div className="expense-modal">
                        <div className="modal-head">
                            <h2>
                                {editingExpense
                                    ? "Edit expense"
                                    : "Record expense"}
                            </h2>

                            <button
                                className="modal-close"
                                onClick={() => setShowModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            className="expense-form"
                            onSubmit={saveExpense}
                        >
                            <div className="form-grid">
                                <div className="form-field full">
                                    <label>Expense title</label>
                                    <input
                                        className="expense-input"
                                        value={form.title}
                                        onChange={(event) =>
                                            updateForm(
                                                "title",
                                                event.target.value
                                            )
                                        }
                                        placeholder="e.g. 5L Jerrycan restock"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Amount (KES)</label>
                                    <input
                                        className="expense-input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(event) =>
                                            updateForm(
                                                "amount",
                                                event.target.value
                                            )
                                        }
                                        placeholder="0"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Date</label>
                                    <input
                                        className="expense-input"
                                        type="date"
                                        value={form.expenseDate}
                                        onChange={(event) =>
                                            updateForm(
                                                "expenseDate",
                                                event.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Category</label>
                                    <select
                                        className="expense-select"
                                        value={form.category}
                                        onChange={(event) =>
                                            updateForm(
                                                "category",
                                                event.target.value
                                            )
                                        }
                                    >
                                        {CATEGORIES.map((item) => (
                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {titleCase(item)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Payment method</label>
                                    <select
                                        className="expense-select"
                                        value={form.paymentMethod}
                                        onChange={(event) =>
                                            updateForm(
                                                "paymentMethod",
                                                event.target.value
                                            )
                                        }
                                    >
                                        {PAYMENT_METHODS.map((item) => (
                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Status</label>
                                    <select
                                        className="expense-select"
                                        value={form.status}
                                        onChange={(event) =>
                                            updateForm(
                                                "status",
                                                event.target.value
                                            )
                                        }
                                    >
                                        {STATUSES.map((item) => (
                                            <option
                                                key={item}
                                                value={item}
                                            >
                                                {titleCase(item)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Supplier / Payee</label>
                                    <input
                                        className="expense-input"
                                        value={form.payee}
                                        onChange={(event) =>
                                            updateForm(
                                                "payee",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Who was paid?"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Reference</label>
                                    <input
                                        className="expense-input"
                                        value={form.reference}
                                        onChange={(event) =>
                                            updateForm(
                                                "reference",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Receipt / invoice / transaction"
                                    />
                                </div>

                                <div className="form-field full">
                                    <label>Description</label>
                                    <textarea
                                        className="expense-input"
                                        value={form.description}
                                        onChange={(event) =>
                                            updateForm(
                                                "description",
                                                event.target.value
                                            )
                                        }
                                        placeholder="What was this expense for?"
                                    />
                                </div>

                                <div className="form-field full">
                                    <label>Internal notes</label>
                                    <textarea
                                        className="expense-input"
                                        value={form.notes}
                                        onChange={(event) =>
                                            updateForm(
                                                "notes",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Optional internal notes"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingExpense
                                        ? "Save changes"
                                        : "Record expense"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedExpense && (
                <div
                    className="modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedExpense(null);
                        }
                    }}
                >
                    <div className="expense-modal">
                        <div className="modal-head">
                            <div>
                                <div className="expense-eyebrow">
                                    Expense details
                                </div>
                                <h2>
                                    {selectedExpense.title ||
                                        "Business Expense"}
                                </h2>
                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setSelectedExpense(null)
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div className="detail-grid">
                            <div className="detail-item">
                                <small>Amount</small>
                                <strong>
                                    {money(selectedExpense.amount)}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Category</small>
                                <strong>
                                    {titleCase(
                                        selectedExpense.category
                                    )}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Status</small>
                                <strong>
                                    {titleCase(
                                        selectedExpense.status
                                    )}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Payment</small>
                                <strong>
                                    {selectedExpense.paymentMethod ||
                                        "—"}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Date</small>
                                <strong>
                                    {formatDate(
                                        selectedExpense.expenseDate
                                    )}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Payee</small>
                                <strong>
                                    {selectedExpense.payee || "—"}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Reference</small>
                                <strong>
                                    {selectedExpense.reference || "—"}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <small>Created</small>
                                <strong>
                                    {formatDate(
                                        selectedExpense.createdAt
                                    )}
                                </strong>
                            </div>

                            <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                                <small>Description</small>
                                <strong>
                                    {selectedExpense.description ||
                                        "No description provided."}
                                </strong>
                            </div>

                            {selectedExpense.notes && (
                                <div
                                    className="detail-item"
                                    style={{ gridColumn: "1 / -1" }}
                                >
                                    <small>Notes</small>
                                    <strong>
                                        {selectedExpense.notes}
                                    </strong>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions" style={{ padding: "0 20px 20px" }}>
                            <button
                                className="secondary-btn"
                                onClick={() => openEdit(selectedExpense)}
                            >
                                Edit expense
                            </button>

                            <button
                                className="save-btn"
                                style={{
                                    background: "#181818",
                                    color: "#ff9999",
                                    borderColor: "#333",
                                }}
                                onClick={() =>
                                    handleDeleteExpense(selectedExpense)
                                }
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}





