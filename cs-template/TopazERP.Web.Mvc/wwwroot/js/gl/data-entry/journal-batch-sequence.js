 

let vue = new Vue({
    el: '#app',
    data: {
        isLoading: false,
        prefix: '',
        suffix: '',
        currentBatchNumber: null,
        nextBatchNumber: 0,
        sequenceIncrement: 1,
    },
   
    methods: {
        
        saveBatchSequence() {
            
            this.isLoading = true;
            
            let payload = {
                Prefix: this.prefix,
                Suffix: this.suffix,
                CurrentBatchNumber: this.currentBatchNumber,
                NextBatchNumber: this.currentBatchNumber + this.sequenceIncrement,
                SequenceIncrement: this.sequenceIncrement
            };
            
            axios.post('/LedgerDataEntry/SetupBatchSequence', payload)
                .then(response => {
                    
                    this.toastHandler('', 'Batch sequence saved.');
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to save batch sequence.');
                    this.isLoading = false;
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
});

