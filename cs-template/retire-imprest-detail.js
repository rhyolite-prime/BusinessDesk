let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        id: null,
        form: {
            id: null,
            retirementDate: '',
            retiredBy: '',
            details: []
        }
    },
    computed: {
        totalAmountRetired() {
            return this.form.details.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        }
    },
    methods: {
        getRecord() {
            this.isShimmerLoading = true;
            axios.get(`/LedgerDataEntry/GetRetirement?id=${this.id}`)
                .then(response => {
                    this.form = response.data;
                    if (this.form.retirementDate) {
                        this.form.retirementDate = this.form.retirementDate.split('T')[0];
                    }
                    if (this.form.details) {
                        this.form.details.forEach(d => {
                            if (d.receiptDate) d.receiptDate = d.receiptDate.split('T')[0];
                        });
                    } else {
                        this.form.details = [];
                    }
                    this.isShimmerLoading = false;
                }).catch(err => {
                    this.isShimmerLoading = false;
                    this.toastHandler('error', 'Unable to fetch record.');
                });
        },
        addDetail() {
            this.form.details.push({
                receiptDate: new Date().toISOString().split('T')[0],
                receiptNo: '',
                description: '',
                amount: 0
            });
        },
        removeDetail(index) {
            this.form.details.splice(index, 1);
        },
        updateRetirement() {
            this.form.amountRetired = this.totalAmountRetired;
            axios.post('/LedgerDataEntry/RetireImprestPost', this.form)
                .then(response => {
                    this.toastHandler('success', 'Retirement updated successfully.');
                    setTimeout(() => window.location.href = '/LedgerDataEntry/Imprest', 1500);
                }).catch(err => {
                    this.toastHandler('error', 'Unable to update retirement.');
                });
        },
        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 5000 };
            if (type === 'error') toastr.error('', message);
            else if (type === 'warning') toastr.warning('', message);
            else toastr.success('', message);
        }
    },
    created() {
        const urlParams = new URLSearchParams(window.location.search);
        this.id = urlParams.get('id');
        if (this.id) {
            this.getRecord();
        }
    }
});
