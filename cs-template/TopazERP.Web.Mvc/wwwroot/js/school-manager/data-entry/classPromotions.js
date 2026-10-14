const app = Vue.createApp({
    data() {
        return {
            excursions: [],
            isEditMode: false,
            loading: false,
            activeTab: 'main',
            form: {
                id: null,
                startDate: null,
                classes: [],
                tenantId: null,
            },
            classes: [],
            classPromotions: [],
            mainClasses: [],
            streams: []
        }
    },

    mounted() {
        this.loadDropdowns();

    },

    methods: {
      
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmDataEntry/GetAllClassPromotions/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((
                classes, promotions, mainClasses, streams
            ) => {
                this.form.classes = classes.data.map(c => {
                    c.name = `${c.className} ${c.streamName}`;
                    return c;
                });
                this.classes = classes.data;
                this.classPromotions = promotions.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
              /*  this.loadClassesForPromotion();
                this.form.startDate = new Date().toISOString().substr(0, 10);*/
                if (this.classPromotions.length > 0) {
                    // 🟢 EXISTING DATA → EDIT MODE
                    this.isEditMode = true;

                    // use the date from existing data
                    this.form.startDate = this.normalizeDate(this.classPromotions[0].startDate);

                    this.populateFromExistingPromotions();
                } else {
                    // 🟢 NO DATA → NEW
                    this.isEditMode = false;
                    this.form.startDate = new Date().toISOString().substr(0, 10);
                    this.loadClassesForPromotion();
                }
            }));
        },
        formatDate(dateInput) {

            return moment(dateInput).format("mm-dd-yyyy");
        },
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
        },
        populateFromExistingPromotions() {

            this.form.classes = this.classes.map(c => {
                const existing = this.classPromotions.find(p => p.fromClassId === c.id);

                return {
                    id: existing ? existing.id : null, // 🔑 keep ID for update
                    fromClassId: c.id,
                    fromClassName: this.getLevelClassNameFromId(c.id),
                    toClassId: existing ? existing.toClassId : null,
                    tenantId: this.form.tenantId
                };
            });

            this.dataTable(this.form.classes);
        },

        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelClassName(levelClass) {
            return `${this.getMainClassName(levelClass.classId)} ${this.getStreamName(levelClass.streamId)}`.trim();
        },
        getLevelClassNameFromId(levelClassId) {
            const levelClass = this.classes.find(c => c.id === levelClassId);
            if (!levelClass) return '';

            const mainName = this.mainClasses.find(m => m.id === levelClass.classId)?.name || '';
            const streamName = this.streams.find(s => s.id === levelClass.streamId)?.name || '';

            return [mainName, streamName].filter(Boolean).join(' ');
        },
        dataTable(responseData) {
            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                pageSettings: { pageSize: 20, pageSizeList: [10, 20, 50, 100] },
                scrollSettings: { width: "1200px", height: "400px" },
                editSettings: { allowEditing: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [
                    { field: "fromClassName", headerText: "Class From", width: 150, isPrimaryKey: true, allowEditing: false },
                    {
                        field: "toClassId",
                        headerText: "Class To",
                        editType: ej.Grid.EditingType.Dropdown,
                        foreignKeyField: "id",
                        foreignKeyValue: "name",
                        dataSource: this.classes.map(c => ({
                            id: c.id,
                            name: this.getLevelClassNameFromId(c.id) 
                        })),
                        width: 200
                    }
                ]
            });
        },
        loadClassesForPromotion() {
            // Build rows with proper derived class name
            this.form.classes = this.classes.map(c => ({
                fromClassId: c.id,
                fromClassName: this.getLevelClassNameFromId(c.id),
                toClassId: null
            }));

            this.dataTable(this.form.classes);
        },


        saveData() {
            const grid = $("#dataTable").data("ejGrid");
            const rows = grid.model.dataSource;

            const promotions = rows
                .filter(r => r.toClassId)
                .map(r => ({
                    id: r.id || null,
                    startDate: this.form.startDate,
                    fromClassId: r.fromClassId,
                    fromClassName: r.fromClassName,
                    toClassId: r.toClassId,
                    toClassName: this.getLevelClassNameFromId(r.toClassId),
                    tenantId: this.form.tenantId
                }));

            if (!promotions.length) {
                toastr.warning("Please select a promotion class for at least one row");
                return;
            }

          /*  // FRONTEND DUPLICATE CHECK (bulk by startDate)
            const selectedDate = new Date(this.form.startDate).toISOString().substr(0, 10); // normalize
            const startDateExists = this.classPromotions.some(existing => {
                const existingDate = new Date(existing.startDate).toISOString().substr(0, 10);
                return existingDate === selectedDate;
            });*/
            

            this.loading = true;

            const requests = promotions.map(promo => {
                if (promo.id) {
                    return axios.post('/SmDataEntry/UpdateClassPromotion', promo);
                } else {
                    return axios.post('/SmDataEntry/CreateClassPromotion', promo);
                }
            });

            Promise.all(requests)
                .then(() => {
                    toastr.success(
                        this.isEditMode
                            ? "Class promotions updated successfully"
                            : "Class promotions saved successfully"
                    );
                    this.loading = false;
                })
                .catch(err => {
                    console.error(err);
                    toastr.error("Failed to save class promotions");
                    this.loading = false;
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

    }
      
   
  

});
app.mount('#app');