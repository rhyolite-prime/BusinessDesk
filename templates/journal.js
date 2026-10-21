const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            moneyConfig: {
                decimal: '.',
                thousands: ',',
                prefix: '',
                suffix: '',
                precision: 2,
                masked: false,
                disableNegative: false
            },
            loadingBatchNo: null,
            isLoadingBatch: false,
            currentView: 'list', // 'list' or 'create'
            searchQuery: '',
            selectedBatches: [],
            expandedBatches: [],
            detailSearch: {},
            deleteTargetId: '',
            glAccountList: [],
            costCenterList: [],
            currencyList: [],
            isBatchNoLoading: false,
            isEditMode: false,
            isSaving: false,
            isLoading: false,
            // Creation form state
            newBatch: {
                batchNo: '',
                batchDate: new Date().toISOString().slice(0, 10),
                isMultiCurrency: false,
                ouId: '',
                lines: []
            }
        };
    },
    computed: {
        isAllBatchesSelected() {
             
        },
        totalLocalDebits() {
            return this.newBatch.lines.reduce((sum, line) => sum + (Number(line.localDebit) || 0), 0);
        },
        totalLocalCredits() {
            return this.newBatch.lines.reduce((sum, line) => sum + (Number(line.localCredit) || 0), 0);
        },
        isBalanced() {
            return Math.abs(this.totalLocalDebits - this.totalLocalCredits) < 0.01;
        }
    },

    methods: {
        // Navigation
        generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        async goToCreateView() {
            this.isEditMode = false;
            this.currentView = 'create';
            this.resetForm();
            // Fetch a fresh system number on every new-batch open to avoid stale lastNo
            await this.getJournalBatchSysNum();
        },
        goToListView() {
            this.currentView = 'list';
        },

        // System Number helpers
        generateNextNo(sysNum) {
            const lastNo = sysNum.lastNo ?? sysNum.LastNo ?? 0;
            const padding = sysNum.padding ?? sysNum.Padding ?? 0;
            const prefix = sysNum.prefix ?? sysNum.Prefix ?? '';
            const suffix = sysNum.suffix ?? sysNum.Suffix ?? '';
            const pattern = sysNum.formatPattern ?? sysNum.FormatPattern ?? '{PREFIX}{NO}{SUFFIX}';

            const nextNo = lastNo + 1;
            const padded = String(nextNo).padStart(padding, '0');
            return pattern
                .replace('{PREFIX}', prefix)
                .replace('{NO}', padded)
                .replace('{SUFFIX}', suffix);
        },

        // Listing Actions
        isExpanded(batchNo) {
            return this.expandedBatches.includes(batchNo);
        },
        toggleExpand(batchNo) {
            const index = this.expandedBatches.indexOf(batchNo);
            if (index > -1) {
                this.expandedBatches.splice(index, 1);
            } else {
                this.expandedBatches.push(batchNo);
            }
        },
         
        clearSelection() {
            this.selectedBatches = [];
        },
        deleteSelectedBatches() {
            if (confirm(`Are you sure you want to delete ${this.selectedBatches.length} selected batch(es)?`)) {
                // Placeholder for API call
                console.log("Delete API call for selected batches");
                this.selectedBatches = [];
            }
        },
        exportSelected() {
            alert(`Saved/Exported data for batches: ${this.selectedBatches.join(', ')}`);
        },
        confirmDelete(id) {
             
            this.deleteTargetId = id;
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        },
        closeDeleteModal() {
            const modalEl = document.getElementById('deleteModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        },
        deleteBatch() {

            this.isLoading = true;

            axios.get('/GeneralLedger/DeleteJournalBatch?id=' + this.deleteTargetId).then((response) => {
                location.reload();
            }).catch((error) => {
                console.log(error);
                this.isLoading = false;
            });
        },
        // Editing
        async editBatch(batchNo) {
            this.loadingBatchNo = batchNo;
            this.isLoadingBatch = true;
            this.isEditMode = true;
            this.currentView = 'create';
            this.resetForm();

            try {
                // Use GetJournalTransactions with batchNumber filter to get the batch with its details
                const response = await axios.get(`/GeneralLedger/GetJournalTransactions?pageNo=1&pageSize=1&batchNumber=${encodeURIComponent(batchNo)}`);
                const result = response.data?.result;
                const data = result?.data;
                const batch = Array.isArray(data) ? data[0] : null;

                if (!batch) {
                    alert('Could not load batch details. Please try again.');
                    this.currentView = 'list';
                    return;
                }

                const batchDate = batch.batchDate;

                this.newBatch = {
                    batchNo: batch.batchNumber,
                    batchDate: batchDate ? batchDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
                    isMultiCurrency: batch.isMultiCurrency,
                    ouId: batch.ouId,
                    ouName: batch.ouName,
                    lines: (batch.details ?? []).map(d => ({
                        id: d.journalId ?? Date.now(),
                        refNo: d.referenceNumber ?? '',
                        accountId: (d.accountId ?? '').toLowerCase(),
                        accountName: d.accountName ?? '',
                        ouId: (d.ouId ?? '').toLowerCase(),
                        ouName: d.ouName ?? '',
                        currencyId: d.currencyId ?? '',
                        currencyName: d.currencyName ?? '',
                        currencyCode: d.currencyCode ?? '',
                        buyRate: d.buyRate ?? 1,
                        sellRate: d.sellRate ?? 1,
                        isLocal: d.isLocal ?? true,
                        localDebit: d.localDebit ?? 0,
                        localCredit: d.localCredit ?? 0,
                        foreignDebit: d.foreignDebit ?? 0,
                        foreignCredit: d.foreignCredit ?? 0,
                        description: d.description ?? '',
                        chequeNo: d.chequeNo ?? ''
                    }))
                };

                console.log('--- DEBUG V-SELECT ---');
                
                this.newBatch.lines.forEach(line => {
                    const foundAcc = this.glAccountList.find(a => a.id === line.accountId);
                    console.log(`Looking for accountId: ${line.accountId}. Found in glAccountList?`, !!foundAcc, foundAcc);
                    const foundOu = this.costCenterList.find(c => c.id === line.ouId);
                    console.log(`Looking for ouId: ${line.ouId}. Found in costCenterList?`, !!foundOu, foundOu);
                });
                
                console.log('----------------------');

            } catch (error) {
                console.error('Failed to load batch for editing:', error);
                alert('An error occurred loading batch details.');
                this.currentView = 'list';
            }
            finally {
                this.loadingBatchNo = null;
                this.isLoadingBatch = false;
            }
        },
        saveLocalCopy(batch) {
            alert(`Exported local copy for Batch #${batch.batchNo}`);
        },

        // Detail table inline search
        filterLines(lines, query) {
            if (!query || !query.trim()) {
                return lines;
            }
            const q = query.toLowerCase();
            return lines.filter(l =>
                l.refNo.toLowerCase().includes(q) ||
                l.accountName.toLowerCase().includes(q) ||
                l.description.toLowerCase().includes(q) ||
                (l.chequeNo && l.chequeNo.toLowerCase().includes(q))
            );
        },

        // Creation form row actions
        resetForm() {
            this.newBatch = {
                batchNo: '',
                batchDate: new Date().toISOString().slice(0, 10),
                isMultiCurrency: false,
                ouId: '',
                ouName: '',
                lines: []
            };
            this.addRow();
            this.addRow();
        },

        addRow() {
            let lastLine = null;
            if (this.newBatch.lines.length > 0) {
                for (let i = this.newBatch.lines.length - 1; i >= 0; i--) {
                    const line = this.newBatch.lines[i];
                    if (line.refNo || line.ouId || line.description) {
                        lastLine = line;
                        break;
                    }
                }
            }

            let localDeficitDebit = 0;
            let localDeficitCredit = 0;
            let foreignDeficitDebit = 0;
            let foreignDeficitCredit = 0;

            if (this.newBatch.lines.length > 0) {
                // 1. Check Local Imbalance first
                const localDiff = (this.totalLocalDebits || 0) - (this.totalLocalCredits || 0);

                // ONLY calculate deficits if the local transaction is NOT balanced
                if (Math.abs(localDiff) > 0.001) {
                    if (localDiff > 0.001) {
                        localDeficitCredit = Number(localDiff.toFixed(2));
                    } else {
                        localDeficitDebit = Number(Math.abs(localDiff).toFixed(2));
                    }

                    // 2. Calculate Foreign Imbalance only to supplement an unbalanced row
                    const totalForeignDebits = this.newBatch.lines.reduce((sum, line) => sum + (Number(line.foreignDebit) || 0), 0);
                    const totalForeignCredits = this.newBatch.lines.reduce((sum, line) => sum + (Number(line.foreignCredit) || 0), 0);
                    const foreignDiff = totalForeignDebits - totalForeignCredits;

                    if (foreignDiff > 0.001) {
                        foreignDeficitCredit = Number(foreignDiff.toFixed(2));
                    } else if (foreignDiff < -0.001) {
                        foreignDeficitDebit = Number(Math.abs(foreignDiff).toFixed(2));
                    }
                }
            }

            this.newBatch.lines.push({
                id: this.generateUUID(),
                refNo: lastLine ? lastLine.refNo : '',
                accountId: '',
                accountName: '',
                ouId: lastLine ? lastLine.ouId : this.newBatch.ouId,
                ouName: '',
                // Inherit currency settings from the last line
                currencyId: lastLine ? lastLine.currencyId : '',
                currencyName: lastLine ? lastLine.currencyName : '',
                currencyCode: lastLine ? lastLine.currencyCode : '',
                buyRate: lastLine ? (lastLine.buyRate || 1) : 1,
                sellRate: lastLine ? (lastLine.sellRate || 1) : 1,
                isLocal: lastLine ? lastLine.isLocal : true,
                description: lastLine ? lastLine.description : '',
                // Assign computed deficits
                localDebit: localDeficitDebit,
                localCredit: localDeficitCredit,
                foreignDebit: foreignDeficitDebit,
                foreignCredit: foreignDeficitCredit,
                recipient: '',
                chequeNo: ''
            });

            console.log('[addRow] Added new line with computed deficits:', {
                isBalanced: Math.abs((this.totalLocalDebits || 0) - (this.totalLocalCredits || 0)) <= 0.001,
                localDeficitDebit,
                localDeficitCredit,
                foreignDeficitDebit,
                foreignDeficitCredit
            });
        },
        
        removeRow(index) {
            if (this.newBatch.lines.length > 1) {
                this.newBatch.lines.splice(index, 1);
            }
        },
        
        removeLastRow() {
            if (this.newBatch.lines.length > 1) {
                this.newBatch.lines.pop();
            }
        },

        onGlAccountSelected(selectedAccount, line) {
            if (!selectedAccount) {
                line.accountName = '';
                line.currencyId = '';
                return;
            }
            // Sync the display name so the form label remains correct
            line.accountName = selectedAccount.name ?? '';

            const currencyId = selectedAccount.currencyId;
            console.log('currencyId->', currencyId);
            
            if (currencyId) {
                line.currencyId = currencyId;
                this.updateLineCurrency(line);
            }
        },
        
        updateLineCurrency(line) {
            const currencyList = this.currencyList || [];
            const currencyObj = currencyList.find(c => c.id === line.currencyId);

            if (currencyObj) {
                console.log('currencyObj', currencyObj)
                line.buyRate = currencyObj.buyRate;
            }

            const isLocal = currencyObj ? (currencyObj.isDefault === true || currencyObj.isDefault === 'true') : true;
            line.isLocal = isLocal;

            if (isLocal) {
                line.buyRate = 1.0;
                line.foreignDebit = 0;
                line.foreignCredit = 0;
            } else {
                // Pre-populate foreign values from local if any exist, or recalculate
                if (line.localDebit) {
                    line.foreignDebit = Number((line.localDebit / (line.buyRate || 1)).toFixed(2));
                }
                if (line.localCredit) {
                    line.foreignCredit = Number((line.localCredit / (line.buyRate || 1)).toFixed(2));
                }
            }
        },

        toggleAllBatches(){
            
            
        },

        onLineValChange(line, field) {
            console.group(`[Journal Log] Row Field Change Triggered: ${field}`);
            console.log(`[Step 1] Initial state:`, {
                field,
                isLocal: line.isLocal,
                buyRate: line.buyRate,
                localDebit: line.localDebit,
                localCredit: line.localCredit,
                foreignDebit: line.foreignDebit,
                foreignCredit: line.foreignCredit
            });

            // 1. Zero-out opposing side logic for current line
            if (line.isLocal) {
                if (field === 'localDebit') {
                    line.foreignDebit = line.localDebit || 0;
                    line.foreignCredit = 0;
                    line.localCredit = 0;
                    console.log(`[Step 2] Local currency line updated for localDebit:`, {
                        localDebit: line.localDebit,
                        foreignDebit: line.foreignDebit
                    });
                } else if (field === 'localCredit') {
                    line.foreignCredit = line.localCredit || 0;
                    line.foreignDebit = 0;
                    line.localDebit = 0;
                    console.log(`[Step 2] Local currency line updated for localCredit:`, {
                        localCredit: line.localCredit,
                        foreignCredit: line.foreignCredit
                    });
                }
            } else {
                const currentRate = line.buyRate || line.rate || 1;
                if (field === 'foreignDebit') {
                    line.localDebit = Number((line.foreignDebit * currentRate).toFixed(2)) || 0;
                    line.foreignCredit = 0;
                    line.localCredit = 0;
                    console.log(`[Step 2] Foreign currency line updated for foreignDebit:`, {
                        foreignDebit: line.foreignDebit,
                        rate: currentRate,
                        calculatedLocalDebit: line.localDebit
                    });
                } else if (field === 'foreignCredit') {
                    line.localCredit = Number((line.foreignCredit * currentRate).toFixed(2)) || 0;
                    line.foreignDebit = 0;
                    line.localDebit = 0;
                    console.log(`[Step 2] Foreign currency line updated for foreignCredit:`, {
                        foreignCredit: line.foreignCredit,
                        rate: currentRate,
                        calculatedLocalCredit: line.localCredit
                    });
                } else if (field === 'buyRate') {
                    if (line.foreignDebit) {
                        line.localDebit = Number((line.foreignDebit * currentRate).toFixed(2)) || 0;
                    }
                    if (line.foreignCredit) {
                        line.localCredit = Number((line.foreignCredit * currentRate).toFixed(2)) || 0;
                    }
                    console.log(`[Step 2] Exchange rate updated:`, {
                        buyRate: currentRate,
                        recalculatedLocalDebit: line.localDebit,
                        recalculatedLocalCredit: line.localCredit
                    });
                }
            }

            // 2. Real-time Auto-balancing logic for fresh transactions (2 rows)
            const isFreshTransaction = !this.isEditMode && this.newBatch.lines.length === 2;
            const lineIndex = this.newBatch.lines.indexOf(line);

            console.log(`[Step 3] Checking fresh transaction conditions:`, {
                isEditMode: this.isEditMode,
                totalLines: this.newBatch.lines.length,
                lineIndex,
                isFreshTransaction
            });

            if (isFreshTransaction && lineIndex === 0) {
                const secondLine = this.newBatch.lines[1];
                if (!secondLine) {
                    console.warn(`[Step 4] Auto-balance skipped: Second row not found.`);
                    console.groupEnd();
                    return;
                }

                const firstLocalDebit = line.localDebit || 0;
                const firstLocalCredit = line.localCredit || 0;
                const firstForeignDebit = line.foreignDebit || 0;
                const firstForeignCredit = line.foreignCredit || 0;

                console.log(`[Step 4] Evaluating Row 1 values for balancing:`, {
                    firstLocalDebit,
                    firstLocalCredit,
                    firstForeignDebit,
                    firstForeignCredit,
                    secondLineIsLocal: secondLine.isLocal
                });

                if (secondLine.isLocal) {
                    // Second line is Local currency: balance directly using local amounts
                    secondLine.localCredit = firstLocalDebit;
                    secondLine.localDebit = firstLocalCredit;
                    secondLine.foreignCredit = firstForeignDebit;
                    secondLine.foreignDebit = firstForeignCredit;

                    console.log(`[Step 5] Auto-balanced Row 2 (Local Currency Target):`, {
                        localDebit: secondLine.localDebit,
                        localCredit: secondLine.localCredit,
                        foreignDebit: secondLine.foreignDebit,
                        foreignCredit: secondLine.foreignCredit
                    });
                } else {
                    // Second line is Foreign currency: balance raw foreign amounts directly
                    const secondRate = secondLine.buyRate || 1;

                    if (firstForeignDebit > 0 || firstLocalDebit > 0) {
                        // Determine raw foreign value to assign to Row 2's credit
                        const rawForeignVal = line.isLocal ? (secondRate > 0 ? Number((firstLocalDebit / secondRate).toFixed(2)) : 0) : firstForeignDebit;

                        secondLine.foreignCredit = rawForeignVal;
                        secondLine.foreignDebit = 0;
                        secondLine.localCredit = Number((rawForeignVal * secondRate).toFixed(2));
                        secondLine.localDebit = 0;

                        console.log(`[Step 5] Auto-balanced Row 2 Foreign Credit:`, {
                            targetRawForeignCredit: rawForeignVal,
                            targetExchangeRate: secondRate,
                            calculatedLocalCredit: secondLine.localCredit
                        });
                    } else if (firstForeignCredit > 0 || firstLocalCredit > 0) {
                        // Determine raw foreign value to assign to Row 2's debit
                        const rawForeignVal = line.isLocal
                            ? (secondRate > 0 ? Number((firstLocalCredit / secondRate).toFixed(2)) : 0)
                            : firstForeignCredit;

                        secondLine.foreignDebit = rawForeignVal;
                        secondLine.foreignCredit = 0;
                        secondLine.localDebit = Number((rawForeignVal * secondRate).toFixed(2));
                        secondLine.localCredit = 0;

                        console.log(`[Step 5] Auto-balanced Row 2 Foreign Debit:`, {
                            targetRawForeignDebit: rawForeignVal,
                            targetExchangeRate: secondRate,
                            calculatedLocalDebit: secondLine.localDebit
                        });
                    } else {
                        secondLine.localDebit = 0;
                        secondLine.localCredit = 0;
                        secondLine.foreignDebit = 0;
                        secondLine.foreignCredit = 0;

                        console.log(`[Step 5] Cleared Row 2 amounts (Row 1 was reset to 0).`);
                    }
                }
            } else {
                console.log(`[Step 4] Auto-balance skipped: Not applicable for this line trigger.`);
            }

            console.groupEnd();
        },

        async saveJournal() {
            // Validation
            if (!this.newBatch.batchNo) {
                alert('Please enter a Batch Number.');
                return;
            }
            if (!this.newBatch.batchDate) {
                alert('Please select a Batch Date.');
                return;
            }
            if (this.newBatch.lines.length === 0) {
                alert('Please add at least one journal line item.');
                return;
            }

            for (let i = 0; i < this.newBatch.lines.length; i++) {
                const line = this.newBatch.lines[i];
                if (!line.accountId && !line.accountName) {
                    alert(`Line ${i + 1}: Please select a G/L Account.`);
                    return;
                }
                if (!line.localDebit && !line.localCredit) {
                    alert(`Line ${i + 1}: Either Local Debit or Local Credit must be greater than zero.`);
                    return;
                }
            }

            if (!this.isBalanced) {
                alert('Cannot save unbalanced journal! Total Debits must equal Total Credits.');
                return;
            }

            const dto = {
                batchNumber: this.newBatch.batchNo,
                batchDate: this.newBatch.batchDate,
                isMultiCurrency: this.newBatch.isMultiCurrency,
                ouId: this.newBatch.ouId,
                ouName: this.newBatch.ouName, // as hierachy
                totalCredit: this.totalLocalCredits,
                totalDebit: this.totalLocalDebits,
                details: this.newBatch.lines.map(line => {
                    // 1. Resolve Account Name
                    const account = this.glAccountList.find(a => a.id === line.accountId);
                    const accountName = line.accountName || account?.name || '';

                    // 2. Resolve Operating Unit / Cost Center Name
                    const costCenter = this.costCenterList.find(c => c.id === line.ouId);
                    const ouName = costCenter?.formattedName;

                    // 3. Resolve Currency Name
                    const currency = this.currencyList.find(c => c.id === line.currencyId);
                    const currencyName = currency.name;
                    const currencyCode = currency.code;

                    return {
                        journalId: line.id,
                        referenceNumber: line.refNo || '',
                        accountId: line.accountId,
                        accountName: accountName,
                        ouId: line.ouId,
                        ouName: ouName,
                        currencyId: line.currencyId,
                        currencyName: currencyName,
                        currencyCode: currencyCode,
                        buyRate: line.buyRate || 1,
                        sellRate: line.sellRate || 1,
                        isLocal: line.isLocal,
                        localDebit: line.localDebit || 0,
                        localCredit: line.localCredit || 0,
                        foreignDebit: line.foreignDebit || 0,
                        foreignCredit: line.foreignCredit || 0,
                        description: line.description || '',
                        chequeNo: line.chequeNo || ''
                    };
                })
            };

            this.isSaving = true;
            try {
                const url = this.isEditMode
                    ? '/GeneralLedger/UpdateJournal'
                    : '/GeneralLedger/CreateJournal';

                const response = await axios.post(url, dto);
                const result = response.data;

                if (result && (result.success)) {
                    this.currentView = 'list';
                    window.location.reload();
                } else {
                    const msg = result?.message ?? 'Failed to save journal. Please try again.';
                    
                }
            } catch (error) {
                console.error('Failed to save journal:', error);
                // show response modal -> 'An error occurred while saving the journal.'
            
            } finally {
                this.isSaving = false;
            }
        },
        
        buildControlPaths(costCenters) {
            let itemMap = new Map();
            if (!costCenters) return [];

            costCenters.forEach(c => {
                let id = c.id || c.Id;
                if (id) itemMap.set(id, c);
            });

            const getPath = (item) => {
                let name = item.name || item.Name || "";
                let parentId = item.parentId || item.ParentId;

                if (parentId && parentId !== this.emptyGuid && parentId !== '00000000-0000-0000-0000-000000000000' && itemMap.has(parentId)) {
                    return getPath(itemMap.get(parentId)) + " / " + name;
                }
                return name;
            };

            return costCenters.map(c => {
                const rawId = c.id ?? c.Id;
                c.id = rawId ? rawId.toLowerCase() : '';
                c.name = c.name ?? c.Name;
                c.formattedName = getPath(c);
                return c;
            }).sort((a, b) => (a.formattedName || "").localeCompare(b.formattedName || ""));
        },

        getCostCenters() {

            axios.get('/GeneralLedger/GetCostCenters?pageNo=1&pageSize=1000').then((response) => {
                if (response.data && response.data.result && response.data.result.data) {
                    this.costCenterList = this.buildControlPaths(response.data.result.data);
                } else if (response.data && response.data.data) {
                    this.costCenterList = this.buildControlPaths(response.data.data);
                } else {
                    this.costCenterList = this.buildControlPaths(response.data);
                }
            }).catch((error) => {
                console.error("Error loading cost centers:", error);
            });
        },

        getCurrencies() {

            axios.get('/Settings/GetCurrencies/?pageNo=1&pageSize=1000').then((response) => {
                const rawData = response.data.result?.data || [];
                this.currencyList = rawData.map(c => ({
                    ...c,
                    id: c.id,
                    name: c.name,
                    buyRate: c.buyRate,
                    isDefault: c.isDefault
                }));
            }).catch((error) => {

                console.log(error);
            });

        },

        getGlAccounts() {
            axios.get('/GeneralLedger/GetAccountDetails/?pageNo=1&pageSize=5000').then((response) => {
                let rawData = [];
                if (response.data && response.data.result && response.data.result.data) {
                    rawData = response.data.result.data;
                } else if (response.data && response.data.data) {
                    rawData = response.data.data;
                } else if (Array.isArray(response.data)) {
                    rawData = response.data;
                }
                
                // Normalize keys to lowercase so v-select binding works reliably
                this.glAccountList = rawData.map(acc => {
                    const rawId = acc.id ?? acc.Id;
                    return {
                        ...acc,
                        id: rawId ? rawId.toLowerCase() : '',
                        name: acc.name ?? acc.Name,
                        currencyId: acc.currencyId ?? acc.CurrencyId
                    };
                });
            }).catch((error) => {
                console.log(error);
            });
        },
        
        async getJournalBatchSysNum() {
            this.isBatchNoLoading = true;
            try {

                const response = await axios.get('/Settings/GetSystemNumbers?key=journal-batch-id');
                // result is a List<SystemNumber> — take the first match
                const list = response.data.result;
                const sysNum = Array.isArray(list) ? list[0] : list;
                if (sysNum) {
                    this.newBatch.batchNo = this.generateNextNo(sysNum);
                }
            } catch (error) {
                console.error('Failed to fetch journal batch system number:', error);
            } finally {
                this.isBatchNoLoading = false;
            }
        },
        // Formats
        formatCurrency(value) {
            return new Intl.NumberFormat('en-GH', {
                style: 'currency',
                currency: 'GHS',
                minimumFractionDigits: 2
            }).format(value);
        },
       
        formatDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = String(date.getDate()).padStart(2, '0');
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        },

    },
    mounted() {

        this.getCostCenters();
        this.getCurrencies();
        this.getGlAccounts();
    }
});

app.component('v-select', window["vue-select"]);

// Register v-money3 component and directive explicitly from UMD exports
const vMoney3 = window['v-money3'];
if (vMoney3) {
    app.component('money3', vMoney3.Money3Component);
    app.directive('money3', vMoney3.VMoney3);
}

app.mount('#app');
