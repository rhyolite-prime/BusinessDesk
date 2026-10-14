let vue = new Vue({
        el: '#app',
        data: {
        isShimmerLoading: false,
        payload: {},
        moduleList: [
            {"Id": 1001, "Name": "General Ledger"},
            {"Id": 2001, "Name": "Payroll"},
            {"Id": 3001, "Name": "School Manager"},
            {"Id": 4001, "Name": "School Pro"},
            {"Id": 5001, "Name": "Stock Manager"},
            {"Id": 6001, "Name": "Account Payables"},
            {"Id": 7001, "Name": "Account Receivables"},
            {"Id": 8001, "Name": "Assets Manager"},
            {"Id": 9001, "Name": "Shared"},
        ], 
        itemNames: [
                {Id: 1001, moduleId: 6001, Name: "ApInvoiceNumbers" , FriendlyName: "AP Invoice Numbers"},
                {Id: 2001, moduleId: 6001, Name: "ApAccountNumbers", FriendlyName: "Supplier Account Numbers"},
                {Id: 3001, moduleId: 6001, Name: "ApInvoiceBatchNumbers", FriendlyName: "AP Invoice Batch Numbers"},
                {Id: 4001, moduleId: 7001, Name: "ArInvoiceNumbers", FriendlyName: "AR Invoice Numbers"},
                {Id: 5001, moduleId: 7001, Name: "ArAccountNumbers", FriendlyName: "Customer Account Numbers"},
                {Id: 6001, moduleId: 7001, Name: "ArInvoiceBatchNumbers", FriendlyName: "AR Invoice Batch Numbers"},
                {Id: 7001, moduleId: 2001, Name: "EmployeeID", FriendlyName: "Employee ID"},
                {Id: 8001, moduleId: 1001, Name: "GL", FriendlyName: ""},
                {Id: 9001, moduleId: 6001, Name: "AP-VoucherBatchNumbers", FriendlyName: "AP Voucher Batch Numbers"},
                {Id: 1002, moduleId: 6001, Name: "AP-PaymentBatchNumbers", FriendlyName: "AP Payment Batch Numbers"},
                {Id: 1101, moduleId: 6001, Name: "AP-MemoBatchNumbers", FriendlyName: "Debit Memo Batch Numbers"},
                {Id: 1201, moduleId: 7001, Name: "AR-MemoBatchNumbers", FriendlyName: "Credit Memo Batch Numbers"},
                {Id: 1301, moduleId: 7001, Name: "AR-PaymentBatchNumbers", FriendlyName: "AR Payment Batch Numbers"},
                {Id: 1401, moduleId: 1001, Name: "GL-VoucherBatchNumbers", FriendlyName: "GL Voucher Batch Numbers"},
                {Id: 1501, moduleId: 3001, Name: "SM-StudentID", FriendlyName: "Student ID"},
                {Id: 1601, moduleId: 3001, Name: "SM-StaffID", FriendlyName: "Staff ID"},
                {Id: 1701, moduleId: 3001, Name: "SM-IndexNo", FriendlyName: "Student Index Number"},
                {Id: 1702, moduleId: 9001, Name: "SupplierID", FriendlyName: "Supplier ID"},
                {Id: 1703, moduleId: 1001, Name: "JournalBatchNumber", FriendlyName: "Journal Batch Numbers"},
                {Id: 1704, moduleId: 3001, Name: "SM-ReceiptNumbers", FriendlyName: "Receipt Numbers"},
                {Id: 1705, moduleId: 3001, Name: "SM-BatchNumbers", FriendlyName: "School Batch Numbers"},
                {Id: 1706, moduleId: 3001, Name: "SM-BillNumbers", FriendlyName: "Bill Numbers"},
                {Id: 1707, moduleId: 1001, Name: "ImprestNo", FriendlyName: "Imprest Number"},
                {Id: 1708, moduleId: 1001, Name: "GL-PettyCashNumbers", FriendlyName: "Petty Cash Numbers"},
            ]
    },

    methods: {
        // Adding unsaved modules and items to the master list
        // Master list is the data already in the db
        buildMasterRows() {
            const moduleById = new Map(this.moduleList.map(m => [String(m.Id), m.Name]));

            return (this.itemNames || []).map(it => {
                const moduleName = moduleById.get(String(it.moduleId)) || "";
                const pk = `${moduleName}__${it.Name}`;

                return {
                    pk: pk,
                    id: null,
                    moduleName: moduleName,
                    friendlyName: it.FriendlyName || it.Name,
                    itemName: it.Name,
                    prefix: "",
                    suffix: "",
                    lastNo: 1,
                    tenantId: null,
                    _isMissing: true
                };
            });
        },

        mergeWithDb(dbRows) {
            const master = this.buildMasterRows();

            const dbIndex = new Map(
                (dbRows || []).map(r => [`${r.moduleName}__${r.itemName}`, r])
            );

            const merged = master.map(m => {
                const db = dbIndex.get(m.pk);
                if (!db) return m;

                return {
                    ...m,
                    ...db,
                    friendlyName: m.friendlyName,
                    pk: m.pk,         // ✅ keep stable pk from master
                    _isMissing: false
                };
            });

            const masterKeys = new Set(master.map(m => m.pk));
            (dbRows || []).forEach(r => {
                const key = `${r.moduleName}__${r.itemName}`;
                if (!masterKeys.has(key)) {
                    merged.push({
                        ...r,
                        pk: key,
                        _isMissing: false
                    });
                }
            });

            return merged;
        },
        getSetupData() {
            axios.get('/SharedResource/GetSystemNumbers')
                .then(response => {
                    const merged = this.mergeWithDb(response.data);
                    merged.sort((a, b) => a.moduleName.localeCompare(b.moduleName));
                    this.renderTable(merged);
                })
                .catch(() => this.toastHandler('error', 'Unable to get system numbers.'));
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: {
                    showToolbar: true,
                    toolbarItems: [ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Update,ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search]
                },
                editSettings: { allowAdding: false, allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true},
                columns: [
                    { field: "pk", visible: false, isPrimaryKey: true },
                    { field: "id", visible: false },
                    { field: "moduleName", headerText: "Module", width: 65, allowEditing: false },
                    { field: "itemName", headerText: "System Number", width: 65, allowEditing: false, visible: false },
                    { field: "friendlyName", headerText: "System Number", width: 65, allowEditing: false },
                    { field: "prefix", headerText: "Prefix", width: 55, validationRules: { required: true, minlength: 1 } },
                    { field: "suffix", headerText: "Suffix", width: 55 },
                    { field: "lastNo", headerText: "Last No.", width: 45, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 0 }, validationRules: { required: true } },
                    { field: "tenantId", visible: false }
                ],
                /* endAdd: (args) => {
 
                     this.addSystemNumber(args.data);
                 },*/
                endEdit: (args) => {
                    if (!args.data.id) {
                        this.addSystemNumber(args.data);
                    } else {
                        this.updateSystemNumber(args.data);
                    }
                },
                endDelete: (args) => {

                    this.delSystemNumber(args.data.id);
                },
                rowDataBound: (args) => {
                    if (args.data && args.data._isMissing) {
                        $(args.row).find('td').css({
                            "font-weight": "700",
                            "color": "#fa6060"
                        });
                    }
                }
            });

        },

        addSystemNumber(payload) {
            const toSend = { ...payload };
            delete toSend.id;
            delete toSend.tenantId;

            toSend.prefix = toSend.prefix || '';
            toSend.suffix = toSend.suffix || '';
            toSend.lastNo = toSend.lastNo || 1;

            axios.post('/SharedResource/CreateSystemNumber', toSend)
                .then(res => {
                    this.getSetupData();
                    if (res.data.code == 200) this.toastHandler('', 'System Number saved.');
                    else this.toastHandler('error', res.data.message);
                })
                .catch(() => this.toastHandler('error', 'Unable to save system number.'));
        },

        updateSystemNumber(payload) {

            if (!payload.prefix) {

                payload.prefix = '';
            }

            if (!payload.suffix) {

                payload.suffix = '';
            }

            if (!payload.lastNo) {

                payload.lastNo = 1;
            }
            axios.post('/SharedResource/UpdateSystemNumber', payload).then(response => {

                this.getSetupData();

                this.toastHandler('', 'System Number updated.');


            }).catch(err => {

                this.toastHandler('error', 'Unable to update system number.');

            });
        },

        delSystemNumber(id) {

            axios.get('/SharedResource/DelSystemNumber?id=' + id).then(response => {

                this.getSetupData();

                this.toastHandler('', 'System Number deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete system number.');

            });
        },
        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
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

    created() {

        this.getSetupData();
    },
});