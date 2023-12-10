//
//  ReportViewController.swift
//  Village
//
//  Created by 조성민 on 12/10/23.
//

import UIKit
import Combine

final class ReportViewController: UIViewController {
    
    typealias ViewModel = ReportViewModel
    
    private let viewModel: ViewModel
    
    private let reportSubject = PassthroughSubject<String, Never>()
    
    private var cancellableBag = Set<AnyCancellable>()
    
    private lazy var headerLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "신고 내용"
        label.font = .systemFont(ofSize: 16)
        
        return label
    }()
    
    private lazy var contentTextView: UITextView = {
        let textView = UITextView()
        textView.translatesAutoresizingMaskIntoConstraints = false
        textView.setLayer()
        textView.textContainerInset = UIEdgeInsets(
            top: 10,
            left: 10,
            bottom: 10,
            right: 10
        )
        textView.font = .systemFont(ofSize: 14)
        
        return textView
    }()
    
    private lazy var infoLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "신고 내용이 사실과 다를 경우 이용 제재를 받을 수 있으니 주의해주세요."
        label.font = .systemFont(ofSize: 14)
        label.textColor = .darkGray
        
        return label
    }()
    
    private lazy var reportButton: UIButton = {
        var configuration = UIButton.Configuration.filled()
        configuration.title = "신고 접수"
        configuration.baseBackgroundColor = .primary500
        configuration.titleAlignment = .center
        configuration.cornerStyle = .medium
        
        let button = UIButton(configuration: configuration)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(reportButtonTapped), for: .touchUpInside)
        
        return button
    }()
    
    private lazy var completeAlert: UIAlertController = {
        let alert = UIAlertController(title: "접수 완료", message: "신고가 접수되었습니다.", preferredStyle: .alert)
        let action = UIAlertAction(title: "신고가 접수되었습니다.", style: .default) { [weak self] action in
            self?.navigationController?.popViewController(animated: true)
        }
        alert.addAction(action)
        
        return alert
    }()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        configureUI()
        configureConstraints()
        configureNavigation()
        bindViewModel()
    }
    
    init(viewModel: ViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    @objc private func reportButtonTapped() {
        reportSubject.send(contentTextView.text)
    }
    
}

private extension ReportViewController {
    
    func configureUI() {
        view.backgroundColor = .systemBackground
        
        view.addSubview(headerLabel)
        view.addSubview(contentTextView)
        view.addSubview(infoLabel)
        view.addSubview(reportButton)
    }
    
    func configureConstraints() {
        NSLayoutConstraint.activate([
            headerLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 10),
            headerLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 10)
        ])
        
        NSLayoutConstraint.activate([
            contentTextView.topAnchor.constraint(equalTo: headerLabel.bottomAnchor, constant: 10),
            contentTextView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 10),
            contentTextView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -10),
            contentTextView.heightAnchor.constraint(equalToConstant: 200)
        ])
        
        NSLayoutConstraint.activate([
            infoLabel.topAnchor.constraint(equalTo: contentTextView.bottomAnchor, constant: 10),
            infoLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 10)
        ])
        
        NSLayoutConstraint.activate([
            reportButton.topAnchor.constraint(equalTo: infoLabel.bottomAnchor, constant: 10),
            reportButton.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 10),
            reportButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -10),
            reportButton.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])
    }
    
    func configureNavigation() {
        navigationItem.title = "사용자 신고"
        navigationItem.backButtonDisplayMode = .minimal
    }
    
    func bindViewModel() {
        let output = viewModel.transform(
            input: ReportViewModel.Input(reportButtonTapped: reportSubject.eraseToAnyPublisher())
        )
        
        output.completeOutput
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                guard let alert = self?.completeAlert else { return }
                self?.present(alert, animated: true)
            }
            .store(in: &cancellableBag)
    }
    
}
