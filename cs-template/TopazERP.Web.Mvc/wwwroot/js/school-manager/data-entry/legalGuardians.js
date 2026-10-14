const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            allStudents: [],
            allGuardians: [],
            editing: false,
            relationships: [],
            titles: [],
            form: {
                id: null,
                legalGuardiaanId: null,
                studentId: null,
                relationshipId: null,
                firstName: '',
                lastName: '',
                otherNames: '',
                phoneNumber: '',
                email: '',
                titleId: null,
                titleName: '',
                placeOfWork: '',
                workPhone: '',
                isLegalGuardian: true,
                tenantId: null,
            },
            assignForm: {
                id: null,
                legalGuardiaanId: null,
                studentId: null,
                relationshipId: null,
                firstName: '',
                lastName: '',
                otherNames: '',
                phoneNumber: '',
                email: '',
                titleId: null,
                titleName: '',
                placeOfWork: '',
                workPhone: '',
                isLegalGuardian: true,
                tenantId: null,
            },
            studentGuardians: [],
            legalGuardianId: null,
            assignedGuardians: [],
            assignedGuardian: [],
            guardianStudents: []
        }
    },
    mounted() {
        this.loadData();
     
    },
    methods: {
        loadData() {
            axios.all([
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmStudentSetups/ListAllStContactRelationship'),
                axios.get(`/JsonDataSample/relationships.json?v=${new Date().getTime()}`),
                axios.get(`/JsonDataSample/titles.json?v=${new Date().getTime()}`)
            ]).then(axios.spread((students, guardians, relationships, titles) => {
              
                this.allStudents = students.data;
                this.allStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.allStudents = this.allStudents.map(s => ({ ...s, name: this.formatStudentName(s) }));
                this.allGuardians = guardians.data;
                this.allGuardians.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.allGuardians = this.allGuardians.map(g => ({ ...g, name: this.formatLegalGuardianName(g) }));
                const uniqueGuardiansMap = new Map();
                this.allGuardians.forEach(g => {
                    if (!uniqueGuardiansMap.has(g.legalGuardiaanId)) {
                        uniqueGuardiansMap.set(g.legalGuardiaanId, {
                            ...g,
                            name: this.formatLegalGuardianName(g)
                        });
                    }
                });
                
                this.assignedGuardians = Array.from(uniqueGuardiansMap.values());

                this.assignedGuardians.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.relationships = relationships.data;
                this.titles = titles.data;
                this.initDropdowns();
            }));
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        formatLegalGuardianName(guardian) {
            return [guardian.lastName, guardian.firstName, guardian.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        getTitleName(titleId) {
            return this.titles.find(t => t.id === titleId)?.name || '';
        },
        getRelationshipName(relationshipId) {
            return this.relationships.find(r => r.id === relationshipId)?.name || '';
        },
        getStudentGuardians(studentId){
            const guardians = this.allGuardians.filter(g => g.studentId === studentId);
            this.studentGuardians = guardians.map(g => ({ ...g, name: this.formatLegalGuardianName(g) }));
            return this.studentGuardians;

        },
        getGuardianInfo(guardianId){
            const guardian = this.allGuardians.find(g => g.legalGuardiaanId === guardianId)
            this.assignedGuardians = guardian;
            console.log(guardian);
            return this.assignedGuardians;
        },
        
        initDropdowns() {
            $('#studentId').ejDropDownList({
                dataSource: this.allStudents,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.studentId = args.value;
                    this.getStudentGuardians(args.value);
                }
            });
            $('#studentId1').ejDropDownList({
                dataSource: this.allStudents,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.assignForm.studentId = args.value;
                }
            });
            $('#relationshipId').ejDropDownList({
                dataSource: this.relationships,
                width: "100%",
                watermarkText: "Select Relationship...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.relationshipId = args.value;
                  
                }
            });
            $('#titleId').ejDropDownList({
                dataSource: this.titles,
                width: "100%",
                watermarkText: "Select Title...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.titleId = args.value;

                }
            });
            $('#relationshipId1').ejDropDownList({
                dataSource: this.relationships,
                width: "100%",
                watermarkText: "Select Relationship...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.relationshipId = args.value;

                }
            });
            $('#titleId1').ejDropDownList({
                dataSource: this.titles,
                width: "100%",
                watermarkText: "Select Title...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.form.titleId = args.value;

                }
            });
            $('#legalGuardianId').ejDropDownList({
                dataSource: this.assignedGuardians,
                width: "100%",
                watermarkText: "Select Legal Guardian...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "legalGuardiaanId" },
                change: args => {
                    this.form.legalGuardiaanId = args.value;
                    this.assignedGuardian = this.allGuardians.find(g => g.legalGuardiaanId === args.value);
                    this.assignGuardian(this.assignedGuardian);
                    this.guardianStudents = this.allGuardians.filter(g => g.legalGuardiaanId ===  args.value);
                    console.log(this.guardianStudents);
                }
            });
        },
        saveGuardian() {
            this.isLoading = true;
            if (this.editing) {
                // update
                axios.post('/SmStudentSetups/UpdateStContactRelationship', this.form)
                    .then(() => {
                        this.toastHandler('success', 'Guardian updated successfully.');
                        this.resetForm();
                        this.loadData();
                    })
                    .catch(() => this.toastHandler('error', 'Unable to update guardian.'))
                    .finally(() => this.isLoading = false);
            } else {
                // create (TenantId is null)
                const payload = {
                    ...this.form,
                    legalGuardiaanId: this.form.legalGuardiaanId || this.uuid(),
                    tenantId: null
                };

                axios.post('/SmStudentSetups/CreateStContactRelationship', payload)
                    .then(() => {
                        this.toastHandler('success', 'Guardian created successfully.');
                        this.resetForm();
                        this.loadData();
                    })
                    .catch(() => this.toastHandler('error', 'Unable to create guardian.'))
                    .finally(() => this.isLoading = false);
            }
        },
       assignStudent() {
            this.isLoading = true;
                // create (TenantId is null)
                const payload = {
                    ...this.assignForm,
                    legalGuardiaanId: this.assignForm.legalGuardiaanId,
                };
                
                if (this.assignForm.studentId === null || this.assignForm.legalGuardiaanId === null){
                    this.toastHandler('warning', 'Please select both student and legal guardian.');
                    this.isLoading = false;
                    return;
                }
                axios.post('/SmStudentSetups/CreateStContactRelationship', payload)
                    .then(() => {
                        this.toastHandler('success', 'Guardian created successfully.');
                        this.resetForm();
                        this.loadData();
                    })
                    .catch(() => this.toastHandler('error', 'Unable to create guardian.'))
                    .finally(() => this.isLoading = false);
        },
        editGuardian(guardian) {
            this.editing = true;
            this.form = { ...guardian };
            // ej dropdowns
            $("#relationshipId").data("ejDropDownList").option("value", this.form.relationshipId);
            $("#titleId").data("ejDropDownList").option("value",this.form.titleId);
            $("#studentId").data("ejDropDownList").option("value", this.form.studentId);
        },
        assignGuardian(guardian) {
            this.assignForm = { ...guardian,
                studentId: null,
            };
            // ej dropdowns
            $("#relationshipId1").data("ejDropDownList").option("value", this.assignForm.relationshipId);
            $("#titleId1").data("ejDropDownList").option("value",this.assignForm.titleId);
            /*$("#studentId1").data("ejDropDownList").option("value", this.assignForm.studentId);*/
        },
      
        deleteGuardian(id) {
            if (!confirm('Are you sure you want to delete this guardian?')) return;
            axios.post(`/SmStudentSetups/DeleteStContactRelationship?id=${id}`)
                .then(() => {
                    this.toastHandler('success', 'Guardian deleted.');
                    this.loadData();
                })
                .catch(() => this.toastHandler('error', 'Unable to delete guardian.'));
        },

        resetForm() {
            this.editing = false;
            this.form = {
                id: null,
                legalGuardiaanId: null,
                studentId: null,
                relationshipId: null,
                firstName: '',
                lastName: '',
                otherNames: '',
                phoneNumber: '',
                email: '',
                titleId: null,
                titleName: '',
                placeOfWork: '',
                workPhone: '',
                isLegalGuardian: true,
                tenantId: null
            };
            this.assignForm = {
                id: null,
                legalGuardiaanId: null,
                studentId: null,
                relationshipId: null,
                firstName: '',
                lastName: '',
                otherNames: '',
                phoneNumber: '',
                email: '',
                titleId: null,
                titleName: '',
                placeOfWork: '',
                workPhone: '',
                isLegalGuardian: true,
                tenantId: null
            };
            $("#relationshipId").data("ejDropDownList").option("value", "");
            $("#titleId").data("ejDropDownList").option("value","");
            $("#studentId").data("ejDropDownList").option("value", "");
            $("#relationshipId1").data("ejDropDownList").option("value", "");
            $("#titleId1").data("ejDropDownList").option("value","");
            $("#legalGuardianId").data("ejDropDownList").option("value", "");
            $("#studentId1").data("ejDropDownList").option("value", "");
            this.isLoading = false;
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
});
app.mount('#app');