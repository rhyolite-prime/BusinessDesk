
let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        payload: {},
        transactionType: 'posted', //unposted
        selectedJournalTransactionsToPost: [],
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    },

    methods: {

        getJournalTransactions() {

            axios.get(`/LedgerDataEntry/GetJournalTransactions?transactionType=${this.transactionType}&startDate=${this.startDate}&endDate=${this.endDate}`)
                .then(response => {

                  console.log(response);

                }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve journal transactions.');

            });
        },

        delVoucher(id) {

            axios.get('/LedgerDataEntry/DelVoucher?id=' + id).then(response => {

                //call method to reload
                this.getSupplierPaymentVouchers();
                this.toastHandler('success', 'Voucher deleted successfully.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete voucher.');

            });
        },

        deleteSupplierVouchers() {
            let voucherIds = this.selectedPaymentVouchersToPost.map(v => v.id);

            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to delete.');
                return;
            }
            
            this.isShimmerLoading = true;
            
            axios.post('/LedgerDataEntry/DeleteVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers deleted successfully.');
                    this.selectedPaymentVouchersToPost = [];
                    this.getSupplierPaymentVouchers();
                }).catch(err => {
                this.toastHandler('error', 'Unable to post vouchers.');
            });
             
        },

        postSupplierVouchers() {
             
            let voucherIds = this.selectedPaymentVouchersToPost.map(v => v.id);
             
            if (voucherIds.length === 0) {
                this.toastHandler('warning', 'Please select at least one voucher to post.');
                return;
            }
            
            axios.post('/LedgerDataEntry/PostVouchers', { ids: voucherIds })
                .then(response => {
                    this.toastHandler('success', 'Vouchers posted successfully.');
                    this.selectedPaymentVouchersToPost = [];
                    this.getSupplierPaymentVouchers();
                }).catch(err => {
                    this.toastHandler('error', 'Unable to post vouchers.');
                });
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

        this.getJournalTransactions();

    },
});