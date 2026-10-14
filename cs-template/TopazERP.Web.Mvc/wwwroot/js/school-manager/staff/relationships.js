const app = Vue.createApp({
    data() {
        return {
            form: {
                staffId: window.staffId || '',

            },
            relationships: [],
            staffList: [],
            relations: [],
            staffName: '',
        }
    },
    methods: {
        getStaffList() {
            axios.get('/SmStaffSetups/ListAllStaffBios')
                .then(res => {
                    this.staffList = res.data;

                    // Now that staffList is loaded, get the staff name
                    if (this.form.staffId) {
                        this.getStaffName();
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to load staff data.'));
        },

        getStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            this.staffName = selected
                ? `${selected.firstName} ${selected.otherName || ''} ${selected.lastName}`.trim()
                : '';

            return this.staffName;
        },
        saveRelation() {
            // save staffName from staffId
            if (this.form.staffId) {
                this.setStaffName();
            }
            if (this.form.id) {
                // If id exists, update instead of create
                this.updateRelations();
                return;
            }
            axios.post('/SmStaffSetups/CreateStaffRelationship', this.form)
                .then(response => {
                    
                    if (response.data.code === 200) {
                        this.toastHandler('', 'relation added successfully.');
                        this.getStaffRelations();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to save relations.'));
        },
        updateRelation() {
            axios.post('/SmStaffSetups/UpdateStaffRelationship', this.form)
                .then(() => {
                    this.toastHandler('', 'relation updated successfully.');
                    this.getStaffRelations(); // refresh table
                })
                .catch(() => this.toastHandler('error', 'Unable to update relation.'));
        },
        loadDropdowns() {
            axios.get('/SharedResource/GetRelationships/').then(res => {
                this.relationships = res.data;
            });
        },
        setRelationshipName() {
            const selected = this.relationships.find(y => y.id === this.form.relationshipId);
            this.form.relationshipName = selected ? selected.name : '';
        },
        setStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            if (selected) {
                this.form.staffName = `${selected.firstName} ${selected.otherName} ${selected.lastName}`.trim();
            } else {
                this.form.staffName = '';
            }
        },


        getStaffRelations() {
            axios.get('/SmStaffSetups/ListAllStaffRelationships/')
                .then(response => {
                    this.relations = response.data.filter(q => q.staffId === this.form.staffId);
                }).catch(() => {
                this.toastHandler('error', 'Unable to load staff relations.');
            });
        },
        editRelation(relation) {
            this.form = {
                ...relation
            };
        },
        deleteRelation(id) {

            axios.post(`/SmStaffSetups/DeleteStaffRelationship?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'relation deleted successfully.');
                    this.getStaffRelations(); 
                })
                .catch(() => this.toastHandler('error', 'Unable to delete relation.'));
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 5000,
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
        this.form.staffId = window.staffId;
      

        this.loadDropdowns();
        this.getStaffList();
        this.getStaffRelations();
    }

});
app.mount('#app');