const { createApp } = Vue;
createApp({
    data() {
        return {
            isLoading: false,
            name: '',
            accountHeadType: 0,
            id: null,
            modalTitle: 'Add Account Head',
            setupEntityName: 'Account Head',
            showSetupModal: false,

        }
    },
    methods: {

        initDeleteSetup(id) {

            this.id = id;

            $("#deleteModal").modal('show');

        },

        deleteSetup() {

            this.isLoading = true;

            axios.get('/GeneralLedger/DeleteAccountHead/?id=' + this.id).then((response) => {

                // reload...
                location.reload();

            }).catch((error) => {

                console.log(error);
            });
        },

        addSetup() {

            this.isLoading = true;

            let payload = {};

            payload.name = this.name;
            payload.accountHeadType = this.accountHeadType;

            if (this.id) {

                payload.id = this.id;

                axios.post('/GeneralLedger/UpdateAccountHead/', payload).then((response) => {

                    // reload...
                    location.reload();

                }).catch((error) => {

                    console.log(error);
                });

            } else {

                axios.post('/GeneralLedger/CreateAccountHead/', payload).then((response) => {

                    // reload...
                    location.reload();

                }).catch((error) => {

                    console.log(error);
                });
            }




        },

        viewSetupDetails(accountHead) {

            this.id = accountHead.Id;
            this.name = accountHead.Name;
            this.accountHeadType = accountHead.AccountHeadType;

            this.modalTitle = `Edit ${this.setupEntityName}`;

            this.showSetupModal = true;
            $("#setupModal").modal('show');

        },
        resetModal() {

            this.name = '';
            this.accountHeadType = 0;
            this.showSetupModal = true;
            this.id = '';
            this.modalTitle = `Add ${this.setupEntityName}`;
            $("#setupModal").modal('show');

        }


    },


    computed: {
        isValidNumber() {

        }
    },
    mounted() {

    }
}).mount("#app");
