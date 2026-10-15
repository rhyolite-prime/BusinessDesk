let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        id: null,
        form: {
            id: null,
            refundDate: '',
            amount: 0,
            receiptNo: '',
            authorizedBy: '',
            refundReceivedBy: '',
            refundType: ''
        }
    },
    methods: {
        getRecord() {
            this.isShimmerLoading = true;
            axios.get(`/LedgerDataEntry/GetRefund?id=${this.id}`)
                .then(response => {
                    this.form = response.data;
                    // Format date for input type=date
                    if (this.form.refundDate) {
                        this.form.refundDate = this.form.refundDate.split('T')[0];
                    }
                    this.isShimmerLoading = false;
                }).catch(err => {
                    this.isShimmerLoading = false;
                    this.toastHandler('error', 'Unable to fetch record.');
                });
        },
        updateRefund() {
            axios.post('/LedgerDataEntry/RefundImprestPost', this.form)
                .then(response => {
                    this.toastHandler('success', 'Refund updated successfully.');
                    setTimeout(() => window.location.href = '/LedgerDataEntry/Imprest', 1500);
                }).catch(err => {
                    this.toastHandler('error', 'Unable to update refund.');
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
