const frappe = require('frappejs');
const utils = require('../../../accounting/utils');

module.exports = {
  name: 'Invoice',
  doctype: 'DocType',
  documentClass: require('./InvoiceDocument.js'),
  print: {
    printFormat: 'Standard Invoice Format'
  },
  isSingle: 0,
  isChild: 0,
  isSubmittable: 1,
  keywordFields: ['name', 'customer'],
  settings: 'InvoiceSettings',
  showTitle: true,
  fields: [
    {
      fieldname: 'date',
      label: 'Date',
      fieldtype: 'Date'
    },
    {
      fieldname: 'customer',
      label: 'Customer',
      fieldtype: 'Link',
      target: 'Party',
      required: 1,
      getFilters: (query, control) => {
        return {
          keywords: ['like', query],
          customer: 1
        };
      }
    },
    {
      fieldname: 'account',
      label: 'Account',
      fieldtype: 'Link',
      target: 'Account',
      formula: (doc) => doc.getFrom('Party', doc.customer , 'default_account'),
      getFilters: (query, control) => {
        return {
          keywords: ['like', query],
          isGroup: 0,
          accountType: 'Receivable'
        };
      }
    },
    {
      fieldname: 'items',
      label: 'Items',
      fieldtype: 'Table',
      childtype: 'InvoiceItem',
      required: true
    },
    {
      fieldname: 'netTotal',
      label: 'Net Total',
      fieldtype: 'Currency',
      formula: (doc) => doc.getSum('items', 'amount'),
      disabled: true,
      readOnly: 1
    },
    {
      fieldname: 'taxes',
      label: 'Taxes',
      fieldtype: 'Table',
      childtype: 'TaxSummary',
      readOnly: 1,
      template: (doc, row) => {
        return `<div class='row'>
                    <div class='col-6'></div>
                    <div class='col-6'>
                        <div class='row' v-for='row in value'>
                            <div class='col-6'>{{row.account}} ({{row.rate}}%)</div>
                            <div class='col-6 text-right'>
                                {{frappe.format(row.amount, 'Currency')}}
                            </div>
                        </div>
                    </div>
                </div>`;
      }
    },
    {
      fieldname: 'grandTotal',
      label: 'Grand Total',
      fieldtype: 'Currency',
      formula: (doc) => doc.getGrandTotal(),
      disabled: true,
      readOnly: 1
    },
    {
      fieldname: 'terms',
      label: 'Terms',
      fieldtype: 'Text'
    }
  ],

  layout: [
    // section 1
    {
      columns: [
        { fields: ['customer', 'account'] },
        { fields: ['date'] }
      ]
    },

    // section 2
    {
      columns: [
        { fields: ['items'] }
      ]
    },

    // section 3
    {
      columns: [
        { fields: ['netTotal', 'taxes', 'grandTotal'] }
      ]
    },

    // section 4
    {
      columns: [
        { fields: ['terms'] }
      ]
    }
  ],

  links: [
    utils.ledgerLink,
    {
      label: 'Make Payment',
      condition: form => form.doc.submitted,
      action: async form => {
        const payment = await frappe.getNewDoc('Payment');
        payment.party = form.doc.customer;
        payment.account = form.doc.account;
        payment.for = [{ referenceType: form.doc.doctype, referenceName: form.doc.name, amount: form.doc.grandTotal }];
        payment.on('afterInsert', () => {
          form.$formModal.close();
          payment.submit();
        })
        await form.$formModal.open(payment);
      }
    }
  ],

  listSettings: {
    getFields(list) {
      return ['name', 'customer', 'grandTotal', 'submitted'];
    },

    getRowHTML(list, data) {
      return `<div class='col-3'>${list.getNameHTML(data)}</div>
                    <div class='col-4 text-muted'>${data.customer}</div>
                    <div class='col-4 text-muted text-right'>${frappe.format(data.grandTotal, 'Currency')}</div>`;
    }
  }
};
