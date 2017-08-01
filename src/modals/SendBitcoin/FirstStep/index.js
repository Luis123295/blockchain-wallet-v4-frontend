import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { actions as reduxFormActions } from 'redux-form'
import { gte, is, equals, isNil, pick } from 'ramda'
import * as crypto from 'crypto'

import { Coin, CoinSelection } from 'dream-wallet/lib'
import { convertToUnit, convertFromUnit } from 'services/ConversionService'
import { actions, selectors } from 'data'
import FirstStep from './template.js'
import settings from 'config'

class FirstStepContainer extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      feeEditDisplayed: false,
      addressesSelectDisplayed: is(Object, props.to),
      addressSelectOpened: true
    }
    // generate seed once for coin selection
    this.seed = crypto.randomBytes(16)
    this.timeout = undefined
    this.handleToggleAddressesToSelect = this.handleToggleAddressesToSelect.bind(this)
    this.handleToggleFeeEdit = this.handleToggleFeeEdit.bind(this)
    this.handleToggleQrCodeCapture = this.handleToggleQrCodeCapture.bind(this)
    this.handleQrCodeScan = this.handleQrCodeScan.bind(this)
    this.handleQrCodeError = this.handleQrCodeError.bind(this)
  }

  componentWillReceiveProps (nextProps) {
    const { network, unit, fee, from, to, target, coins, changeAddress } = nextProps

    // Refresh the selection if fee, from, to or amount have been updated
    if (gte(fee, 0) && target && coins && changeAddress && !equals(pick(['fee', 'to', 'from', 'amount'], nextProps), pick(['fee', 'to', 'from', 'amount'], this.props))) {
      if (this.timeout) { clearTimeout(this.timeout) }
      this.timeout = setTimeout(() => {
        
        // this.props.paymentActions.refreshSelection(fee, target, coins, changeAddress, 'descentDraw', this.seed.toString('hex'))
        this.props.paymentActions.refreshSelection(fee, target, coins, changeAddress, 'singleRandomDraw', this.seed.toString('hex'))
      }, 1000)
    }

    // Update the coins if from has been updated
    if (!isNil(from) && !equals(from, this.props.from)) {
      this.props.paymentActions.getUnspents(from)
    }

    // Update the display of the field 'to' if to has been updated
    if (!equals(to, this.props.too)) {
      this.setState({ addressesSelectDisplayed: is(Object, to) })
    }

    // Update the effectiveBalance value if fee or coins have been updated
    if ((gte(fee, 0)) && (!equals(coins, this.props.coins) || !equals(fee, this.props.fee))) {
      const effectiveBalance = CoinSelection.effectiveBalance(fee, coins).value
      const effectiveBalanceTransformed = convertToUnit(network, effectiveBalance, unit).getOrElse({ amount: 0 })
      if (!equals(this.props.effectiveBalance, effectiveBalanceTransformed)) {
        this.props.reduxFormActions.change('sendBitcoin', 'effectiveBalance', effectiveBalanceTransformed.amount)
      }
    }
  }

  handleToggleAddressesToSelect () {
    this.setState({ addressesSelectDisplayed: !this.state.addressesSelectDisplayed })
    if (this.state.addressesSelectDisplayed) { this.props.reduxFormActions.change('sendBitcoin', 'to', '') }
  }

  handleToggleFeeEdit () {
    this.setState({ feeEditDisplayed: !this.state.feeEditDisplayed })
  }

  handleToggleQrCodeCapture () {
    this.props.modalActions.showModalQRCodeCapture(this.handleQrCodeScan, this.handleQrCodeError)
  }

  handleQrCodeScan (data) {
    if (data) {
      this.props.alertActions.displaySuccess(data)
      this.props.reduxFormActions.change('sendBitcoin', 'to', data)
      this.props.modalActions.closeModal()
    }
  }

  handleQrCodeError (error) {
    this.props.alertActions.displayError(error)
  }

  render () {
    return <FirstStep
      addressesSelectDisplayed={this.state.addressesSelectDisplayed}
      feeEditDisplayed={this.state.feeEditDisplayed}
      handleToggleAddressesToSelect={this.handleToggleAddressesToSelect}
      handleToggleFeeEdit={this.handleToggleFeeEdit}
      handleToggleQrCodeCapture={this.handleToggleQrCodeCapture}
      {...this.props}
    />
  }
}

const selectAddress = (addressValue, selectorFunction) => {
  if (is(String, addressValue)) {
    return addressValue
  } else {
    return addressValue
      ? addressValue.address
        ? addressValue.address
        : selectorFunction(addressValue.index)
      : undefined
  }
}

const mapStateToProps = (state, ownProps) => {
  const getReceive = index => selectors.core.common.getNextAvailableReceiveAddress(settings.NETWORK, index, state)
  const getChange = index => selectors.core.common.getNextAvailableChangeAddress(settings.NETWORK, index, state)

  const satoshis = convertFromUnit(ownProps.network, ownProps.amount, ownProps.unit).getOrElse({ amount: undefined, symbol: 'N/A' })
  const targetAddress = selectAddress(ownProps.to, getReceive)
  const target = targetAddress && gte(satoshis.amount, 0) ? Coin.fromJS({ address: targetAddress, value: satoshis.amount }) : undefined

  return {
    changeAddress: selectAddress(ownProps.from, getChange),
    coins: selectors.core.payment.getCoins(state),
    feeValues: selectors.core.fee.getFee(state),
    target
  }
}

const mapDispatchToProps = (dispatch) => ({
  alertActions: bindActionCreators(actions.alerts, dispatch),
  feeActions: bindActionCreators(actions.core.fee, dispatch),
  modalActions: bindActionCreators(actions.modals, dispatch),
  paymentActions: bindActionCreators(actions.core.payment, dispatch),
  reduxFormActions: bindActionCreators(reduxFormActions, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(FirstStepContainer)
