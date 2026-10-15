const { createApp } = Vue;
createApp({
    data() {
        return {
            isLoading: false,
            name: '',
            minAccount: null,
            maxAccount: null,
            accountHeadId: '',

            parentControlId: '',
            id: null,
            modalTitle: 'Add Account Control',
            setupEntityName: 'Account Control',
            showSetupModal: false,
            accountControlList: [],
            accountHeadList: [],
            emptyGuid: '00000000-0000-0000-0000-000000000000',

        }
    },
    methods: {

        initDeleteSetup(id) {

            this.id = id;

            $("#deleteModal").modal('show');

        },

        buildControlPaths(controls) {
            let controlMap = new Map();
            if (!controls) return [];

            controls.forEach(c => {
                let id = c.id || c.Id;
                if (id) controlMap.set(id, c);
            });

            const getPath = (control) => {
                let name = control.name || control.Name || control.subGroupName || control.SubGroupName || "";
                let parentId = control.parentControlId || control.ParentControlId;

                if (parentId && parentId !== this.emptyGuid && parentId !== '00000000-0000-0000-0000-000000000000' && controlMap.has(parentId)) {
                    return getPath(controlMap.get(parentId)) + " / " + name;
                }
                return name;
            };

            return controls.map(c => {
                c.formattedName = getPath(c);
                return c;
            }).sort((a, b) => (a.formattedName || "").localeCompare(b.formattedName || ""));
        },

        getControlsByAccountHead() {

            axios.get('/GeneralLedger/GetControlsByAccountHead?id=' + this.accountHeadId).then((response) => {

                this.accountControlList = this.buildControlPaths(response.data.result);

            }).catch((error) => {

                console.log(error);
            });

        },

        getAccountHeads() {

            axios.get('/GeneralLedger/GetAccountHeads?pageNo=1&pageSize=1000').then((response) => {

                this.accountHeadList = response.data.result.data;

            }).catch((error) => {

                console.log(error);
            });

        },

        getAccountControls() {

            axios.get('/LedgerSetups/GetAccountControl?pageNo=1&pageSize=1000').then((response) => {

                this.accountControlList = this.buildControlPaths(response.data.result.data);

            }).catch((error) => {

                console.log(error);
            });

        },

        deleteSetup() {

            this.isLoading = true;

            axios.get('/LedgerSetups/DeleteAccountControl?id=' + this.id).then((response) => {

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
            payload.minAccount = this.minAccount;
            payload.maxAccount = this.maxAccount;
            payload.accountHeadId = this.accountHeadId;

            let accountHeadTypeInfo = this.accountHeadList.find(item => item.id === this.accountHeadId);

            payload.accountHeadType = accountHeadTypeInfo.accountHeadType;
            payload.parentControlId = (!this.parentControlId || this.parentControlId === '') ? this.emptyGuid : this.parentControlId;

            if (this.id) {

                payload.id = this.id;

                axios.post('/GeneralLedger/UpdateAccountControl/', payload).then((response) => {

                    // reload...
                    location.reload();

                }).catch((error) => {

                    console.log(error);
                });

            } else {

                axios.post('/GeneralLedger/CreateAccountControl/', payload).then((response) => {

                    // reload...
                    location.reload();

                }).catch((error) => {

                    console.log(error);
                });
            }

        },

        closeCoaControlSetupModal() {
            //reset variables here

        },

        viewSetupDetails(accountControl) {

            this.id = accountControl.Id;
            this.name = accountControl.Name;
            this.minAccount = accountControl.MinAccount;
            this.maxAccount = accountControl.MaxAccount;
            this.accountHeadId = accountControl.AccountHeadId;
            this.accountHeadType = accountControl.AccountHeadType;
            this.parentControlId = accountControl.ParentControlId === this.emptyGuid ? '' : accountControl.ParentControlId;

            this.modalTitle = `Edit ${this.setupEntityName}`;

            this.showSetupModal = true;
            $("#setupModal").modal('show');

        },
        resetModal() {

            this.name = '';
            this.minAccount = null;
            this.maxAccount = null;
            this.accountHeadId = '';
            this.accountHeadType = 0;
            this.parentControlId = '';
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
    watch: {
        accountHeadId(newVal, oldVal) {
            if (newVal) {
                this.getControlsByAccountHead();
            }
        }
    },
    mounted() {

        this.getAccountHeads();
        this.getAccountControls();

    }
}).mount("#app");

// Tree table row collapsing/expanding logic
document.addEventListener('click', function (e) {
    // Check if clicked element or its parent matches .tree-row
    const row = e.target.closest('.tree-row');
    if (!row) return;

    // If clicked on an action button, icon or link, do not toggle
    if (e.target.closest('a, button, i.ti-edit, i.ti-trash')) {
        return;
    }

    const id = row.getAttribute('data-id');
    const isExpanded = row.getAttribute('data-expanded') === 'true';

    if (isExpanded) {
        // Collapse: hide all descendants recursively
        collapseNode(id);
        row.setAttribute('data-expanded', 'false');
        const toggleIcon = row.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.classList.remove('ti-chevron-down');
            toggleIcon.classList.add('ti-chevron-right');
        }
    } else {
        // Expand: show immediate children
        expandNode(id);
        row.setAttribute('data-expanded', 'true');
        const toggleIcon = row.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.classList.remove('ti-chevron-right');
            toggleIcon.classList.add('ti-chevron-down');
        }
    }
});

function collapseNode(parentId) {
    document.querySelectorAll(`tr[data-parent-id="${parentId}"]`).forEach(function (childRow) {
        childRow.style.display = 'none';
        const childId = childRow.getAttribute('data-id');
        collapseNode(childId);
    });
}

function expandNode(parentId) {
    document.querySelectorAll(`tr[data-parent-id="${parentId}"]`).forEach(function (childRow) {
        childRow.style.display = '';
        if (childRow.getAttribute('data-expanded') === 'true') {
            const childId = childRow.getAttribute('data-id');
            expandNode(childId);
        }
    });
}
