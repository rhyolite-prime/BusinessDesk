const app = Vue.createApp({
    data() {
        return {
            stage: 'Primary',
            tableRows: [],
            saving: false,
            selectAll: false
        }
    },
    mounted() {
        this.loadStageRemarks(); 
    },
    methods: {
        addRow() {
            this.tableRows.unshift({
                id: null,
                gradeNumber: '',
                minMark: null,
                maxMark: null,
                remark: '',
                tenantId: null,
                saving: false,
                selected: true
            });

            this.$nextTick(() => {
                const firstInput = document.querySelector('tbody tr input');
                firstInput?.focus();
            });
        },
        toggleSelectAll() {

            this.tableRows.forEach(row => {
                row.selected = this.selectAll;
            });

        },
        saveSelected() {

            const selectedRows = this.tableRows.filter(r => r.selected);

            if (selectedRows.length === 0) {
                this.toast('error', 'Select at least one row.');
                return;
            }

            selectedRows.forEach(row => {
                this.saveRow(row);
            });

        },

        // Save single row
        saveRow(row) {

            if (!row.gradeNumber ||
                row.minMark === null ||
                row.maxMark === null ||
                !row.remark) {

                this.toast('error', 'Complete all fields for selected rows.');
                return;
            }

            row.saving = true;

            const api = row.id
                ? '/SmDataEntry/UpdateSubjectRemark'
                : '/SmDataEntry/CreateSubjectRemark';

            const payload = {
                id: row.id,
                stage: this.stage,
                gradeNumber: row.gradeNumber,
                minMark: row.minMark,
                maxMark: row.maxMark,
                remark: row.remark,
                tenantId: row.tenantId
            };

            axios.post(api, payload)

                .then(res => {

                    // Assign new id after create
                    if (!row.id && res.data.id) {
                        row.id = res.data.id;
                    }

                    this.toast('', 'Saved successfully.');

                })

                .catch(() => {

                    this.toast('error', 'Failed to save row.');

                })

                .finally(() => {

                    row.saving = false;

                });

        },

        // Delete selected rows
        deleteSelected() {

            const selectedRows = this.tableRows.filter(r => r.selected);

            if (selectedRows.length === 0) {
                this.toast('error', 'Select rows to delete.');
                return;
            }

            if (!confirm('Delete selected rows?')) return;

            selectedRows.forEach(row => {

                // Existing row in DB
                if (row.id) {

                    axios.get('/SmDataEntry/DeleteSubjectRemark', {
                        params: { id: row.id }
                    })
                        .then(() => {

                            this.tableRows =
                                this.tableRows.filter(r => r !== row);

                        });

                }
                else {

                    // Unsaved row
                    this.tableRows =
                        this.tableRows.filter(r => r !== row);

                }

            });

            this.toast('', 'Deleted successfully.');

        },
        loadStageRemarks() {
            axios.get('/SmDataEntry/GetAllSubjectRemarks')
                .then(res => {
                    const filtered = res.data.filter(r => r.stage === this.stage);
                    //sort by maxMark descending
                    filtered.sort((a, b) => b.maxMark - a.maxMark);
                    this.tableRows = filtered.map(r => ({
                        id: r.id,
                        gradeNumber: r.gradeNumber,
                        minMark: r.minMark,
                        maxMark: r.maxMark,
                        remark: r.remark,
                        tenantId: r.tenantId,
                        saving: false
                    }));
                });
        },
        resetTable() {
            this.tableRows = [];
        },

        toast(type, message) {
            toastr.options = { closeButton: true, progressBar: true };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        }

    }
});
app.mount('#app');