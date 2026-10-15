let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        payload: {},
        filters: {
            startDate: new Date(
                new Date().setMonth(new Date().getMonth() - 3)
            ).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
        },
        activeTab: 'disbursements',
        selectedItems: {
            disbursements: [],
            retirements: [],
            refunds: [],
            writeoffs: []
        }
    },

    methods: {
        getImprests() {
            axios.get('/LedgerDataEntry/GetImprests').then(response => {
                this.renderTable(response.data);
            }).catch(err => {
                this.renderTable([]);
                this.toastHandler('error', 'Unable to get imprests.');
            });
        },

        getRetirements() {
            axios.get('/LedgerDataEntry/GetImprestRetirements').then(response => {
                this.renderRetirementsTable(response.data);
            }).catch(err => {
                this.renderRetirementsTable([]);
                this.toastHandler('error', 'Unable to get retirements.');
            });
        },

        getRefunds() {
            axios.get('/LedgerDataEntry/GetImprestRefunds').then(response => {
                this.renderRefundsTable(response.data);
            }).catch(err => {
                this.renderRefundsTable([]);
                this.toastHandler('error', 'Unable to get refunds.');
            });
        },

        getWriteoffs() {
            axios.get('/LedgerDataEntry/GetImprestWriteoffs').then(response => {
                this.renderWriteoffsTable(response.data);
            }).catch(err => {
                this.renderWriteoffsTable([]);
                this.toastHandler('error', 'Unable to get writeoffs.');
            });
        },

        handleSelection(type, data, isSelected) {
            if (Array.isArray(data)) {
                // Handle "Select All" array
                data.forEach(item => this.handleSelection(type, item, isSelected));
                return;
            }

            if (isSelected) {
                if (!this.selectedItems[type].find(x => x.id === data.id)) {
                    this.selectedItems[type].push(data);
                }
            } else {
                this.selectedItems[type] = this.selectedItems[type].filter(x => x.id !== data.id);
            }
        },

        postSelected() {
            let ids = this.selectedItems[this.activeTab].map(v => v.id);

            if (ids.length === 0) {
                this.toastHandler('warning', 'Please select at least one record to post.');
                return;
            }

            let endpoint = '';
            switch (this.activeTab) {
                case 'disbursements': endpoint = '/LedgerDataEntry/PostImprestsToGL'; break;
                case 'retirements': endpoint = '/LedgerDataEntry/PostRetirementsToGL'; break;
                case 'refunds': endpoint = '/LedgerDataEntry/PostRefundsToGL'; break;
                case 'writeoffs': endpoint = '/LedgerDataEntry/PostWriteoffsToGL'; break;
            }

            axios.post(endpoint, { ids: ids })
                .then(response => {
                    this.toastHandler('success', 'Records posted to GL successfully.');
                    this.selectedItems[this.activeTab] = [];
                    this.refreshActiveTab();
                }).catch(err => {
                    this.toastHandler('error', 'Unable to post records.');
                });
        },

        deleteSelected() {
            let ids = this.selectedItems[this.activeTab].map(v => v.id);

            if (ids.length === 0) {
                this.toastHandler('warning', 'Please select at least one record to delete.');
                return;
            }

            if (!confirm('Are you sure you want to delete the selected records?')) return;

            let endpoint = '';
            switch (this.activeTab) {
                case 'disbursements': endpoint = '/LedgerDataEntry/DeleteBulkImprests'; break;
                case 'retirements': endpoint = '/LedgerDataEntry/DeleteBulkRetirements'; break;
                case 'refunds': endpoint = '/LedgerDataEntry/DeleteBulkRefunds'; break;
                case 'writeoffs': endpoint = '/LedgerDataEntry/DeleteBulkWriteoffs'; break;
            }

            axios.post(endpoint, { ids: ids })
                .then(response => {
                    this.toastHandler('success', 'Records deleted successfully.');
                    this.selectedItems[this.activeTab] = [];
                    this.refreshActiveTab();
                }).catch(err => {
                    this.toastHandler('error', 'Unable to delete records.');
                });
        },

        refreshActiveTab() {
            switch (this.activeTab) {
                case 'disbursements': this.getImprests(); break;
                case 'retirements': this.getRetirements(); break;
                case 'refunds': this.getRefunds(); break;
                case 'writeoffs': this.getWriteoffs(); break;
            }
        },

        renderTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "disbursementDate", headerText: "Date", format: "{0:MM/dd/yyyy}", width: 45 },
                    { field: "employeeName", headerText: "Employee", width: 45 },
                    { field: "imprestCategoryName", headerText: "Category", width: 45 },
                    { field: "description", headerText: "Description", width: 45 },
                    { field: "amount", headerText: "Amount", width: 45 },
                    { field: "balance", headerText: "Outstanding", width: 45 },
                    { field: "expectedRetirementDate", headerText: "Retirement Date", format: "{0:MM/dd/yyyy}", width: 45 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },
                ],
                rowSelected: (args) => this.handleSelection('disbursements', args.data, true),
                rowDeselected: (args) => this.handleSelection('disbursements', args.data, false),
                endDelete: (args) => {
                    axios.get(`/LedgerDataEntry/DelImprest?id=${args.data.id}`)
                        .then(() => this.toastHandler('success', 'Deleted successfully'))
                        .catch(() => this.toastHandler('error', 'Delete failed'));
                },
            });
        },

        renderRetirementsTable(responseData) {
            $("#retirementsTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "retirementDate", headerText: "Date", format: "{0:MM/dd/yyyy}", width: 45 },
                    { field: "amountRetired", headerText: "Amount Retired", width: 45 },
                    { field: "retiredBy", headerText: "Retired By", width: 45 },
                ],
                recordDoubleClick: (args) => {
                    window.location.href = `/LedgerDataEntry/RetireImprestDetail?id=${args.data.id}`;
                },
                rowSelected: (args) => this.handleSelection('retirements', args.data, true),
                rowDeselected: (args) => this.handleSelection('retirements', args.data, false),
            });
        },

        renderRefundsTable(responseData) {
            $("#refundsTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "refundDate", headerText: "Date", format: "{0:MM/dd/yyyy}", width: 45 },
                    { field: "refundType", headerText: "Refund Type", width: 45 },
                    { field: "amount", headerText: "Amount", width: 45 },
                    { field: "receiptNo", headerText: "Receipt No", width: 45 },
                ],
                recordDoubleClick: (args) => {
                    window.location.href = `/LedgerDataEntry/RefundImprestDetail?id=${args.data.id}`;
                },
                rowSelected: (args) => this.handleSelection('refunds', args.data, true),
                rowDeselected: (args) => this.handleSelection('refunds', args.data, false),
            });
        },

        renderWriteoffsTable(responseData) {
            $("#writeoffsTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 35 },
                    { field: "writeOffDate", headerText: "Date", format: "{0:MM/dd/yyyy}", width: 45 },
                    { field: "amount", headerText: "Amount", width: 45 },
                    { field: "writtenOffBy", headerText: "Written Off By", width: 45 },
                    { field: "notes", headerText: "Notes", width: 45 },
                    { field: "postedToGL", headerText: "Posted", width: 35 },
                ],
                recordDoubleClick: (args) => {
                    window.location.href = `/LedgerDataEntry/WriteOffImprestDetail?id=${args.data.id}`;
                },
                rowSelected: (args) => this.handleSelection('writeoffs', args.data, true),
                rowDeselected: (args) => this.handleSelection('writeoffs', args.data, false),
            });
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {
                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }
        },
    },

    mounted() {
        $('a[data-toggle="tab"]').on('shown.bs.tab', (e) => {
            let target = $(e.target).attr("href").replace('#', ''); // activated tab
            this.activeTab = target;
        });
    },

    created() {
        this.getImprests();
        this.getRetirements();
        this.getRefunds();
        this.getWriteoffs();
    }
});