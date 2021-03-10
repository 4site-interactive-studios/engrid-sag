const tippy = require('tippy.js').default;

document.onreadystatechange = () => {    
    if(document.readyState === "complete"){
        // Add placeholder to the Mobile Phone Field
        let enFieldMobilePhone = document.querySelectorAll('input#en__field_supporter_NOT_TAGGED_42')[0];
        if(enFieldMobilePhone){
            enFieldMobilePhone.placeholder = "Phone Number (Optional)";
        }

        // Add placeholder to the Mobile Phone Field
        let enFieldTransactionComments = document.querySelectorAll('textarea#en__field_transaction_comments')[0];
        if(enFieldTransactionComments){
          enFieldTransactionComments.placeholder = "Your personal message";
        }

        // Add placeholder to the Bank Account Number
        let enFieldBankAccountNumber = document.querySelectorAll('input#en__field_supporter_bankAccountNumber')[0];
        if(enFieldBankAccountNumber){
          enFieldBankAccountNumber.placeholder = "Account Number";
        }

        // let inlineMonthly = document.querySelectorAll('.inline-monthly-upsell')[0];
        // let recurrFrequencyField = document.querySelectorAll('.en__field--recurrfreq')[0];
        // if (inlineMonthly && recurrFrequencyField) {
        //   recurrFrequencyField.insertAdjacentElement("beforeend", inlineMonthly);
        // //   giftAmountHeader.style.visibility='visible';
        // }

        let ccvvLabel = document.querySelectorAll('.en__field--ccvv > label')[0];
        if(ccvvLabel){
            let el = document.createElement('span');
            let childEl = document.createElement('a');
            childEl.href='#';
            childEl.id = 'ccv-popcorn';
            childEl.className="whats-this";
            childEl.tabIndex="-1";
            childEl.innerText="What's this?";
            childEl.addEventListener('click',e=>e.preventDefault());
            el.appendChild(childEl);
            ccvvLabel.appendChild(el);
            tippy("#ccv-popcorn", {
              content:
                "The three or four digit security code on your debit or credit card",
            });
        }
  }
};