const app = Vue.createApp({
    data() {
        return {
            payload: [],
            relationshipList: [],
            titleList: [],
            contactList: [],
            studentName: "",

            form: {
                id: "",
                studentId: window.studentId || "",
                relationshipId: "",
                relationshipName: "",
                titleId: "",
                titleName: "",
                firstName: "",
                lastName: "",
                otherNames: "",
                phoneNumber: "",
                contactNumber: "",
                email: "",
                placeOfWork: "",
                workPhone: "",
                isLegalGuardian: false,
                legalGuardiaanId: null
            }
        }
    },

    methods: {
        goBack() {
            window.history.back();
        },
        getDropdowns() {
            axios.get(`/jsonDataSample/relationships.json?v=${new Date().getTime()}`).then(res => {
                this.relationshipList = res.data;

                $("#relationshipId").ejDropDownList({
                    dataSource: this.relationshipList,
                    watermarkText: "Select...",
                    width: "100%",
                    enableFilterSearch: true,
                    fields: { id: "id", text: "name", value: "id" },
                    change: args => this.form.relationshipId = args.value
                });
            });

            axios.get(`/jsonDataSample/titles.json?v=${new Date().getTime()}`).then(res => {
                this.titleList = res.data;

                $("#titleId").ejDropDownList({
                    dataSource: this.titleList,
                    watermarkText: "Select...",
                    width: "100%",
                    enableFilterSearch: true,
                    fields: { id: "id", text: "name", value: "id" },
                    change: args => this.form.titleId = args.value
                });
            });
        },

        getStudent() {
            axios.get(`/SmStudentSetups/GetStudentById?id=${this.form.studentId}`)
                .then(res => {
                    this.payload = res.data;
                    this.studentName = `${res.data.firstName} ${res.data.otherName || ''} ${res.data.lastName}`.trim();
                })
                .catch(() => this.toastHandler('error', 'Unable to get student data.'));
        },

        getContacts() {
            axios.get('/SmStudentSetups/ListAllStContactRelationship')
                .then(res => {
                    this.contactList = res.data.filter(x => x.studentId === this.form.studentId);
                });
        },
        uuid() {

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        saveContact() {

            this.setRelationshipName();
            this.setTitleName();

            let payload;
            if (this.form.id) {

                payload = {
                    ...this.form,
                };

            }
            else {

                payload = {
                    ...this.form,
                    legalGuardiaanId: this.uuid(),
                    tenantId: null
                };
            }

            let api = this.form.id
                ? '/SmStudentSetups/UpdateStContactRelationship'
                : '/SmStudentSetups/CreateStContactRelationship';

            axios.post(api, payload)
                .then(() => {
                    this.toastHandler('', 'Contact saved successfully.');
                    this.getContacts();
                    this.resetForm();
                });
        },


        deleteContact(id) {
            axios.post(`/SmStudentSetups/DeleteStContactRelationship?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Contact deleted.');
                    this.getContacts();
                });
        },

        setRelationshipName() {
            let r = this.relationshipList.find(x => x.id === this.form.relationshipId);
            this.form.relationshipName = r ? r.name : "";
        },

        setTitleName() {
            let t = this.titleList.find(x => x.id === this.form.titleId);
            this.form.titleName = t ? t.name : "";
        },

        editContact(item) {
           this.form.id = item.id;
              this.form.studentId = item.studentId;
            this.form.relationshipId = item.relationshipId;
            this.form.relationshipName = item.relationshipName;
            this.form.titleId = item.titleId;
            this.form.titleName = item.titleName;
            this.form.firstName = item.firstName;
            this.form.lastName = item.lastName;
            this.form.otherNames = item.otherNames;
            this.form.phoneNumber = item.phoneNumber;
            this.form.contactNumber = item.contactNumber;
            this.form.email = item.email;
            this.form.placeOfWork = item.placeOfWork;
            this.form.workPhone = item.workPhone;
            this.form.isLegalGuardian = item.isLegalGuardian;
            this.form.tenantId = item.tenantId;
            this.form.legalGuardiaanId = item.legalGuardiaanId;
            
            
            $("#relationshipId").data("ejDropDownList").option("value", item.relationshipId);
            $("#titleId").data("ejDropDownList").option("value", item.titleId);
        },

        resetForm() {
            this.form = {
                id: "",
                studentId: window.studentId || "",
                relationshipId: "",
                relationshipName: "",
                titleId: "",
                titleName: "",
                firstName: "",
                lastName: "",
                otherNames: "",
                phoneNumber: "",
                contactNumber: "",
                email: "",
                placeOfWork: "",
                workPhone: "",
                isLegalGuardian: false,
                legalGuardiaanId: null
            };

            $("#relationshipId").ejDropDownList("value", "");
            $("#titleId").ejDropDownList("value", "");
        },

        toastHandler(type, message) {
            toastr.success(message);
        }
    },

    mounted() {
        this.getDropdowns();
        this.getStudent();
        this.getContacts();
    }
});
app.mount('#app');
